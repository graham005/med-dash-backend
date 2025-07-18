import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Octokit } from '@octokit/rest';

interface MedicalContext {
  content: string;
  source: string;
  relevanceScore: number;
}

export interface BotResponse {
  answer: string;
  confidence: number;
  sources: string[];
  escalate: boolean;
  reasoning?: string;
}

@Injectable()
export class HealthBotService {
  private readonly logger = new Logger(HealthBotService.name);
  private readonly openRouterApiKey: string;
  private readonly githubToken: string;
  private readonly medicalRepoUrl: string;
  private readonly octokit: Octokit;
  private medicalKnowledgeBase: Map<string, string> = new Map();
  private lastKnowledgeBaseUpdate = 0;
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  // Emergency/escalation keywords
  private readonly EMERGENCY_KEYWORDS = [
    'emergency', 'urgent', 'severe pain', 'chest pain', 'difficulty breathing',
    'unconscious', 'bleeding', 'overdose', 'suicide', 'heart attack', 'stroke',
    'allergic reaction', 'anaphylaxis', 'seizure', 'choking'
  ];

  private readonly ESCALATION_KEYWORDS = [
    'diagnosis', 'prescribe', 'surgery', 'cancer', 'tumor', 'chronic condition',
    'specialist', 'second opinion', 'treatment plan', 'therapy'
  ];

  constructor(private readonly configService: ConfigService) {
    const openRouterApiKey = this.configService.get<string>('OPEN_ROUTER');
    const githubToken = this.configService.get<string>('GITHUB_TOKEN');
    const medicalRepoUrl = this.configService.get<string>('GITHUB_MEDICAL_REPO');

    if (!openRouterApiKey) {
      throw new Error('OPEN_ROUTER API key is required');
    }
    if (!githubToken) {
      throw new Error('GITHUB_TOKEN is required');
    }
    if (!medicalRepoUrl) {
      throw new Error('GITHUB_MEDICAL_REPO is required');
    }

    this.openRouterApiKey = openRouterApiKey;
    this.githubToken = githubToken;
    this.medicalRepoUrl = medicalRepoUrl;

    this.octokit = new Octokit({
      auth: this.githubToken,
    });

    // Initialize knowledge base
    this.initializeKnowledgeBase();
  }

  async askQuestion(question: string): Promise<BotResponse> {
    try {
      this.logger.log(`Received question: ${question}`);

      // Check for emergency situations
      if (this.isEmergency(question)) {
        return this.handleEmergency();
      }

      // Update knowledge base if needed
      await this.updateKnowledgeBaseIfNeeded();

      // Retrieve relevant medical context
      const relevantContext = await this.retrieveRelevantContext(question);

      // Check if escalation is needed
      const shouldEscalate = this.shouldEscalate(question, relevantContext);

      // Generate response using OpenRouter
      const response = await this.generateResponse(question, relevantContext, shouldEscalate);

      return response;
    } catch (error) {
      this.logger.error(`Error processing question: ${error.message}`, error.stack);
      throw new HttpException(
        'Unable to process your question at the moment. Please try again later.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async initializeKnowledgeBase(): Promise<void> {
    try {
      this.logger.log('Initializing medical knowledge base...');
      await this.loadMedicalGuidelines();
      this.lastKnowledgeBaseUpdate = Date.now();
      this.logger.log(`Knowledge base initialized with ${this.medicalKnowledgeBase.size} documents`);
    } catch (error) {
      this.logger.error('Failed to initialize knowledge base:', error.message);
    }
  }

  private async updateKnowledgeBaseIfNeeded(): Promise<void> {
    const now = Date.now();
    if (now - this.lastKnowledgeBaseUpdate > this.CACHE_DURATION) {
      await this.initializeKnowledgeBase();
    }
  }

  private async loadMedicalGuidelines(): Promise<void> {
    try {
      const repoPath = this.extractRepoPath(this.medicalRepoUrl);
      const { data: contents } = await this.octokit.rest.repos.getContent({
        owner: repoPath.owner,
        repo: repoPath.repo,
        path: '',
      });

      if (Array.isArray(contents)) {
        for (const item of contents) {
          if (item.type === 'file' && this.isMedicalFile(item.name)) {
            await this.loadFileContent(repoPath.owner, repoPath.repo, item.path);
          } else if (item.type === 'dir') {
            await this.loadDirectoryContents(repoPath.owner, repoPath.repo, item.path);
          }
        }
      }
    } catch (error) {
      this.logger.error('Error loading medical guidelines:', error.message);
    }
  }

  private async loadDirectoryContents(owner: string, repo: string, path: string): Promise<void> {
    try {
      const { data: contents } = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path,
      });

      if (Array.isArray(contents)) {
        for (const item of contents) {
          if (item.type === 'file' && this.isMedicalFile(item.name)) {
            await this.loadFileContent(owner, repo, item.path);
          }
        }
      }
    } catch (error) {
      this.logger.warn(`Error loading directory ${path}:`, error.message);
    }
  }

  private async loadFileContent(owner: string, repo: string, path: string): Promise<void> {
    try {
      const { data: file } = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path,
      });

      if ('content' in file) {
        const content = Buffer.from(file.content, 'base64').toString('utf-8');
        this.medicalKnowledgeBase.set(path, content);
      }
    } catch (error) {
      this.logger.warn(`Error loading file ${path}:`, error.message);
    }
  }

  private extractRepoPath(url: string): { owner: string; repo: string } {
    const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) {
      throw new Error('Invalid GitHub repository URL');
    }
    return { owner: match[1], repo: match[2] };
  }

  private isMedicalFile(filename: string): boolean {
    const medicalExtensions = ['.md', '.txt', '.json', '.yml', '.yaml'];
    const medicalKeywords = ['medical', 'guideline', 'protocol', 'medication', 'drug', 'treatment'];
    
    const hasValidExtension = medicalExtensions.some(ext => filename.toLowerCase().endsWith(ext));
    const hasValidKeyword = medicalKeywords.some(keyword => filename.toLowerCase().includes(keyword));
    
    return hasValidExtension && (hasValidKeyword || filename.toLowerCase().includes('readme'));
  }

  private async retrieveRelevantContext(question: string): Promise<MedicalContext[]> {
    const questionLower = question.toLowerCase();
    const relevantContexts: MedicalContext[] = [];

    for (const [source, content] of this.medicalKnowledgeBase.entries()) {
      const relevanceScore = this.calculateRelevance(questionLower, content.toLowerCase());
      
      if (relevanceScore > 0.1) {
        // Extract relevant sections
        const relevantSections = this.extractRelevantSections(content, questionLower);
        
        relevantContexts.push({
          content: relevantSections,
          source,
          relevanceScore,
        });
      }
    }

    // Sort by relevance and take top 3
    return relevantContexts
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 3);
  }

  private calculateRelevance(question: string, content: string): number {
    const questionWords = question.split(/\s+/).filter(word => word.length > 3);
    const contentWords = content.split(/\s+/);
    
    let matches = 0;
    for (const word of questionWords) {
      if (contentWords.some(cWord => cWord.includes(word) || word.includes(cWord))) {
        matches++;
      }
    }
    
    return matches / questionWords.length;
  }

  private extractRelevantSections(content: string, question: string): string {
    const lines = content.split('\n');
    const relevantLines: string[] = [];
    const questionWords = question.split(/\s+/).filter(word => word.length > 3);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      const hasRelevantContent = questionWords.some(word => line.includes(word));
      
      if (hasRelevantContent) {
        // Include context (previous and next lines)
        const start = Math.max(0, i - 2);
        const end = Math.min(lines.length, i + 3);
        
        for (let j = start; j < end; j++) {
          if (!relevantLines.includes(lines[j])) {
            relevantLines.push(lines[j]);
          }
        }
      }
    }

    return relevantLines.join('\n').substring(0, 2000); // Limit context size
  }

  private isEmergency(question: string): boolean {
    const questionLower = question.toLowerCase();
    return this.EMERGENCY_KEYWORDS.some(keyword => questionLower.includes(keyword));
  }

  private shouldEscalate(question: string, context: MedicalContext[]): boolean {
    const questionLower = question.toLowerCase();
    
    // Check for escalation keywords
    const hasEscalationKeywords = this.ESCALATION_KEYWORDS.some(keyword => 
      questionLower.includes(keyword)
    );

    // Check if we have insufficient context
    const hasInsufficientContext = context.length === 0 || 
      context.every(c => c.relevanceScore < 0.3);

    // Check for complex medical queries
    const isComplexQuery = questionLower.includes('why') || 
      questionLower.includes('what if') || 
      questionLower.includes('should i');

    return hasEscalationKeywords || (hasInsufficientContext && isComplexQuery);
  }

  private handleEmergency(): BotResponse {
    return {
      answer: "🚨 This appears to be a medical emergency. Please call emergency services immediately (911/112) or go to the nearest emergency room. Do not delay seeking immediate medical attention.",
      confidence: 1.0,
      sources: ['Emergency Protocol'],
      escalate: true,
      reasoning: 'Emergency keywords detected'
    };
  }

  private async generateResponse(
    question: string,
    context: MedicalContext[],
    shouldEscalate: boolean
  ): Promise<BotResponse> {
    try {
      const systemPrompt = this.buildSystemPrompt();
      const contextText = context.map(c => `Source: ${c.source}\n${c.content}`).join('\n\n');
      
      const userPrompt = `
Context from medical guidelines:
${contextText}

Question: ${question}

${shouldEscalate ? 'Note: This question may require professional medical consultation.' : ''}

Please provide a helpful response following the guidelines in your system prompt.
`;

      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: 'tngtech/deepseek-r1t2-chimera:free',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.3,
          max_tokens: 1000,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openRouterApiKey}`,
            'Content-Type': 'applic10ation/json',
          },
          timeout: 30000,
        }
      );

      const aiResponse = response.data.choices[0]?.message?.content || 
        'I apologize, but I cannot provide a response at this time.';

      // Calculate confidence based on context quality
      const confidence = this.calculateConfidence(context, shouldEscalate);

      return {
        answer: this.formatResponse(aiResponse, shouldEscalate),
        confidence,
        sources: context.map(c => c.source),
        escalate: shouldEscalate,
      };

    } catch (error) {
      this.logger.error('Error generating AI response:', error.message);
      
      return {
        answer: this.getFallbackResponse(question),
        confidence: 0.5,
        sources: ['Fallback Response'],
        escalate: true,
      };
    }
  }

  private buildSystemPrompt(): string {
    return `You are a helpful medical information assistant designed to provide general health guidance. 

IMPORTANT GUIDELINES:
- You provide GENERAL INFORMATION ONLY, not medical diagnosis or treatment
- Always remind users to consult healthcare professionals for medical decisions
- Be supportive, empathetic, and clear in your responses
- If unsure about something, recommend consulting a healthcare provider
- Focus on medication information, post-visit instructions, and general wellness
- Never provide specific dosages unless citing official guidelines
- Always include appropriate disclaimers

FORMAT YOUR RESPONSES:
- Start with a helpful answer based on available medical guidelines
- Include relevant safety information
- End with a recommendation to consult healthcare providers when appropriate
- Keep responses concise but informative (under 300 words)

Remember: You're here to support and inform, not replace professional medical care.`;
  }

  private calculateConfidence(context: MedicalContext[], shouldEscalate: boolean): number {
    if (shouldEscalate) return 0.6;
    if (context.length === 0) return 0.3;
    
    const avgRelevance = context.reduce((sum, c) => sum + c.relevanceScore, 0) / context.length;
    return Math.min(0.9, 0.5 + (avgRelevance * 0.4));
  }

  private formatResponse(aiResponse: string, shouldEscalate: boolean): string {
    let formattedResponse = aiResponse.trim();

    // Add escalation notice if needed
    if (shouldEscalate) {
      formattedResponse += '\n\n⚠️ **Professional Consultation Recommended**: This question would benefit from speaking with a healthcare provider who can consider your specific medical history and current situation.';
    }

    // Add general disclaimer
    formattedResponse += '\n\n💡 **Reminder**: This information is for educational purposes only and should not replace professional medical advice.';

    return formattedResponse;
  }

  private getFallbackResponse(question: string): string {
    const questionLower = question.toLowerCase();
    
    if (questionLower.includes('medication') || questionLower.includes('drug')) {
      return `I understand you have a question about medication. For accurate and safe medication information, I recommend:

📞 Contacting your pharmacist or healthcare provider
💊 Checking with your prescribing doctor
🏥 Calling your healthcare facility's nurse line

For immediate medication concerns, especially regarding side effects or interactions, please contact a healthcare professional directly.

⚠️ **Important**: Never stop or change medications without consulting your healthcare provider first.`;
    }

    return `I appreciate your health question, but I'm unable to provide a comprehensive answer at this moment. For the best guidance regarding your health concern, I recommend:

👩‍⚕️ Consulting with your healthcare provider
📞 Calling your doctor's office or nurse line
🏥 Visiting an urgent care facility if it's time-sensitive

Your health and safety are important, and a healthcare professional can provide personalized advice based on your medical history.`;
  }

  // Health check method for monitoring
  async getServiceHealth(): Promise<{ status: string; knowledgeBaseSize: number; lastUpdate: Date }> {
    return {
      status: 'healthy',
      knowledgeBaseSize: this.medicalKnowledgeBase.size,
      lastUpdate: new Date(this.lastKnowledgeBaseUpdate),
    };
  }
}