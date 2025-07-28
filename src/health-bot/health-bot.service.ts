import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Octokit } from '@octokit/rest';
import { AppointmentsService } from 'src/appointments/appointments.service';
import { CreateAppointmentDto } from 'src/appointments/dto/create-appointment.dto';
import { User } from 'src/users/entities/user.entity';
import { AppointmentStatus } from 'src/enums';
import { PrescriptionService } from 'src/pharmacy/prescription/prescription.service';
import { MedicineService } from 'src/pharmacy/medicine/medicine.service';

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

  private readonly APPOINTMENT_KEYWORDS = [
    'schedule appointment', 'book appointment', 'make appointment', 'appointment',
    'see doctor', 'visit doctor', 'consultation', 'check up', 'follow up',
    'my appointments', 'upcoming appointments', 'cancel appointment'
  ];

  // Add these to your existing keywords
  private readonly MEDICINE_KEYWORDS = [
    'medicines', 'medication', 'drugs', 'pills', 'prescription medicine',
    'what does', 'side effects', 'what is', 'medicine effects', 'drug effects',
    'my prescription', 'prescription medicines', 'medicine in prescription'
  ];

  // Temporary in-memory message store per user
  private userMessageContext: Map<string, { [key: string]: any }> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly appointmentsService: AppointmentsService,
    private readonly prescriptionService: PrescriptionService,
    private readonly medicineService: MedicineService, 
  ) {
    const togetherApiKey = this.configService.get<string>('TOGETHER_TOKEN');
    const githubToken = this.configService.get<string>('GITHUB_TOKEN');
    const medicalRepoUrl = this.configService.get<string>('GITHUB_MEDICAL_REPO');

    if (!togetherApiKey) {
      throw new Error('TOGETHER_TOKEN is required');
    }
    if (!githubToken) {
      throw new Error('GITHUB_TOKEN is required');
    }
    if (!medicalRepoUrl) {
      throw new Error('GITHUB_MEDICAL_REPO is required');
    }

    this.openRouterApiKey = togetherApiKey;
    this.githubToken = githubToken;
    this.medicalRepoUrl = medicalRepoUrl;

    this.octokit = new Octokit({
      auth: this.githubToken,
    });

    // Initialize knowledge base
    this.initializeKnowledgeBase();
  }

  async askQuestion(question: string, user?: User): Promise<BotResponse> {
    try {
      this.logger.log(`Received question: ${question}`);

      // Store the message for logged-in users
      if (user) {
        this.storeUserMessage(user.id, question);
      }

      // Check for emergency situations
      if (this.isEmergency(question)) {
        return this.handleEmergency();
      }

      // Check for appointment-related queries
      if (this.isAppointmentQuery(question)) {
        return await this.handleAppointmentQuery(question, user);
      }

      // Check for medicine-related queries
      if (this.isMedicineQuery(question)) {
        return await this.handleMedicineQuery(question, user);
      }

      // Update knowledge base if needed
      await this.updateKnowledgeBaseIfNeeded();

      // Retrieve relevant medical context
      const relevantContext = await this.retrieveRelevantContext(question);

      // Check if escalation is needed
      const shouldEscalate = this.shouldEscalate(question, relevantContext);

      // Generate response using Together.ai
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
        'https://api.together.xyz/v1/chat/completions',
        {
          model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
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
            'Content-Type': 'application/json',
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
    return `You are a helpful medical information assistant designed to provide general health guidance and appointment assistance.

IMPORTANT GUIDELINES:
- You provide GENERAL INFORMATION ONLY, not medical diagnosis or treatment
- Always remind users to consult healthcare professionals for medical decisions
- Be supportive, empathetic, and clear in your responses
- If unsure about something, recommend consulting a healthcare provider
- Focus on medication information, post-visit instructions, and general wellness
- Never provide specific dosages unless citing official guidelines
- Always include appropriate disclaimers
- Don't answer any question that is not related to medicine or appointments
- If a question is asked that is not related to medical assistance or appointments, tell the user to find more reliable sources

APPOINTMENT ASSISTANCE:
- Help users understand appointment scheduling processes
- Provide guidance on viewing, booking, and canceling appointments
- Direct users to appropriate resources for appointment management
- Explain different types of medical appointments available

FORMAT YOUR RESPONSES:
- Start with a helpful answer based on available medical guidelines
- Include relevant safety information
- End with a recommendation to consult healthcare providers when appropriate
- Keep responses concise but informative (under 200 words for appointment queries)

Remember: You're here to support and inform, not replace professional medical care or appointment booking systems.`;
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

  async scheduleAppointment(createAppointmentDto: CreateAppointmentDto, user: User) {
    const result = await this.appointmentsService.create(createAppointmentDto, user);
    this.userMessageContext.delete(user.id); // Clear context after booking
    return result;
  }

  async getUserAppointments(user: User) {
    return this.appointmentsService.findAll(user);
  }

  private isAppointmentQuery(question: string): boolean {
    const questionLower = question.toLowerCase();
    return this.APPOINTMENT_KEYWORDS.some(keyword => questionLower.includes(keyword));
  }

  private isMedicineQuery(question: string): boolean {
    const questionLower = question.toLowerCase();
    return this.MEDICINE_KEYWORDS.some(keyword => questionLower.includes(keyword));
  }

  private async handleAppointmentQuery(question: string, user?: User): Promise<BotResponse> {
    const questionLower = question.toLowerCase();

    // If user is not provided, suggest authentication
    if (!user) {
      return {
        answer: `I can help you with appointments! However, you need to be logged in to:

📅 **Schedule appointments** - Book consultations with doctors
👀 **View appointments** - See your upcoming and past appointments  
❌ **Cancel appointments** - Manage your scheduled visits

Please log in to access appointment features, or ask me general health questions without logging in.

🔗 **Next Steps:** Use the authenticated chat or log into your account to manage appointments.`,
        confidence: 0.9,
        sources: ['Appointment System'],
        escalate: false,
        reasoning: 'Appointment query detected but user not authenticated'
      };
    }

    try {
      // Handle different types of appointment queries
      if (questionLower.includes('my appointments') || questionLower.includes('upcoming')) {
        return await this.handleViewAppointments(user);
      } else if (questionLower.includes('schedule') || questionLower.includes('book') || questionLower.includes('make')) {
        return this.handleScheduleAppointmentRequest(question, user);
      } else if (questionLower.includes('cancel')) {
        return this.handleCancelAppointmentRequest();
      } else {
        return this.handleGeneralAppointmentInquiry();
      }
    } catch (error) {
      this.logger.error(`Error handling appointment query: ${error.message}`);
      return {
        answer: `I'm having trouble accessing your appointment information right now. Please try:

📞 **Contact Support** - Reach out to our support team
🌐 **Use the Website** - Navigate to the appointments section directly
🔄 **Try Again** - Ask me again in a moment

For urgent appointment needs, please contact your healthcare provider directly.`,
        confidence: 0.3,
        sources: ['System Error'],
        escalate: true,
        reasoning: 'Error accessing appointment system'
      };
    }
  }

  private async handleViewAppointments(user: User): Promise<BotResponse> {
    try {
      const appointments = await this.appointmentsService.findAll(user);

      if (appointments.length === 0) {
        return {
          answer: `📅 **No Appointments Found**

You currently don't have any scheduled appointments.

Would you like me to help you:
• **Schedule a new appointment** - Book a consultation with a doctor
• **Find available doctors** - Browse healthcare providers
• **Learn about our services** - Understand what we offer

Just let me know how I can assist you!`,
          confidence: 0.9,
          sources: ['Appointment Database'],
          escalate: false,
          reasoning: 'No appointments found for user'
        };
      }

      // Format appointments for display
      const upcomingAppts = appointments.filter(apt => new Date(apt.startTime) > new Date())
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
        .slice(0, 3); // Show next 3 appointments

      let appointmentList = '';
      upcomingAppts.forEach((apt, index) => {
        const date = new Date(apt.startTime).toLocaleDateString();
        const time = new Date(apt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const doctorName = `Dr. ${apt.doctor.user.firstName} ${apt.doctor.user.lastName}`;

        appointmentList += `${index + 1}. **${doctorName}**
   📅 ${date} at ${time}
   📋 ${apt.reasonForVisit}
   ⚡ Status: ${apt.status}
   ${apt.meetingUrl ? '🔗 Virtual consultation available' : '🏥 In-person visit'}

`;
      });

      return {
        answer: `📅 **Your Upcoming Appointments**

${appointmentList}

💡 **Need Help?**
• Ask me to "cancel appointment" to modify your schedule
• Say "schedule appointment" to book a new visit
• Contact your doctor directly for urgent matters

${appointments.length > 3 ? `\n📊 Showing 3 of ${appointments.length} total appointments` : ''}`,
        confidence: 0.95,
        sources: ['Appointment Database'],
        escalate: false,
        reasoning: 'Successfully retrieved user appointments'
      };

    } catch (error) {
      if (error.message.includes('No Appointments Found')) {
        return {
          answer: `📅 **No Appointments Scheduled**

You don't have any appointments at the moment.

🚀 **Ready to get started?**
• Say "schedule appointment" to book with a doctor
• Ask me about available doctors or services
• Browse specialties and find the right care for you

I'm here to help you navigate your healthcare journey!`,
          confidence: 0.8,
          sources: ['Appointment System'],
          escalate: false,
          reasoning: 'No appointments found in database'
        };
      }
      throw error; // Re-throw other errors to be handled by parent
    }
  }

  private handleScheduleAppointmentRequest(question: string, user?: User): BotResponse {
    // Parse the question for any specific details
    const questionLower = question.toLowerCase();
    let schedulingTips = '';

    if (questionLower.includes('urgent') || questionLower.includes('asap') || questionLower.includes('emergency')) {
      schedulingTips = `🚨 **For Urgent Care:**
• Contact your doctor's emergency line
• Visit urgent care or ER for immediate needs
• Call our 24/7 helpline for guidance

`;
    }

    return {
      answer: `📅 **Ready to Schedule an Appointment?**

${schedulingTips}I can help guide you, but you'll need to complete the booking through our appointment system.

🔗 **To Schedule:**
1. **Use the API endpoint:** \`POST /health-bot/schedule-appointment\`
2. **Or navigate to:** Your patient dashboard → Appointments → Schedule New

📋 **You'll Need:**
• Preferred doctor ID
• Appointment date and time
• Reason for visit
• Available time slot ID

💡 **Tips:**
• Check doctor availability first
• Book consultations for virtual visits
• Allow extra time for new patient visits

Would you like me to help you find available doctors or time slots?`,
      confidence: 0.85,
      sources: ['Appointment Scheduling System'],
      escalate: false,
      reasoning: 'Providing appointment scheduling guidance'
    };
  }

  private handleCancelAppointmentRequest(): BotResponse {
    return {
      answer: `❌ **Cancel an Appointment**

I understand you need to cancel an appointment. Here's how:

🔧 **Cancellation Options:**
• **Through your account:** Patient Dashboard → My Appointments → Cancel
• **Call directly:** Contact your doctor's office
• **Use our API:** \`DELETE /appointments/:id\`

⏰ **Important Notes:**
• Cancel at least 24 hours in advance when possible
• Last-minute cancellations may incur fees  
• Emergency cancellations are always understood

🔄 **Need to Reschedule Instead?**
• Cancel your current appointment first
• Then schedule a new one at your preferred time
• Or call the office to reschedule directly

Would you like me to show you your current appointments so you can identify which one to cancel?`,
      confidence: 0.9,
      sources: ['Appointment Management System'],
      escalate: false,
      reasoning: 'Providing appointment cancellation guidance'
    };
  }

  private handleGeneralAppointmentInquiry(): BotResponse {
    return {
      answer: `📅 **Appointment Information**

I can help you with various appointment-related tasks:

🔍 **What I Can Help With:**
• **View appointments** - "Show my appointments" or "upcoming appointments"  
• **Schedule guidance** - "How do I book an appointment?"
• **Cancellation help** - "How to cancel appointment"
• **Doctor information** - "Find doctors" or "available specialists"

📱 **Quick Actions:**
• Say "my appointments" to see your schedule
• Say "schedule appointment" for booking help  
• Ask about specific doctors or specialties

🏥 **Appointment Types:**
• **Consultations** - Virtual meetings with doctors
• **Check-ups** - Regular health visits
• **Follow-ups** - Post-treatment appointments
• **Specialist visits** - Targeted medical care

How can I assist you with your appointments today?`,
      confidence: 0.8,
      sources: ['Appointment System Guide'],
      escalate: false,
      reasoning: 'General appointment information requested'
    };
  }

  private storeUserMessage(userId: string, message: string) {
    // Get or create the user's context
    const context = this.userMessageContext.get(userId) || { messages: [] };
    context.messages.push({ text: message, timestamp: new Date() });
    this.userMessageContext.set(userId, context);
  }

  private async handleMedicineQuery(question: string, user?: User): Promise<BotResponse> {
    const questionLower = question.toLowerCase();

    if (!user) {
      return {
        answer: `🔒 **Login Required**

To access your medicine information, please log in.

💊 **Available after login:**
• View your prescriptions and medicines  
• Get detailed medicine information
• Learn about side effects and usage

🔐 Please log in to continue.`,
      confidence: 0.9,
      sources: ['Authentication System'],
      escalate: false,
      reasoning: 'Medicine query requires authentication'
    };
    }

    try {
      // Handle different query types
      if (questionLower.includes('prescriptions') || questionLower.includes('my prescriptions')) {
        return await this.handlePrescriptionListQuery(await this.getUserPrescriptions(user.id));
      } 
      else if (questionLower.includes('medicines') || questionLower.includes('my medicines')) {
        return await this.handleUserPrescriptionMedicines(user);
      }
      else if (questionLower.includes('who prescribed')) {
        return await this.handleWhoPrescribedQuery(questionLower, user);
      }
        else if (this.extractMedicineName(question)) {
        const medicineName = this.extractMedicineName(question);
        if (medicineName) {
          return await this.handleSpecificMedicineQuery(medicineName, question, user);
        } else {
          return this.handleMedicineHelp();
        }
      } 
      else {
        return this.handleMedicineHelp();
      }
    } catch (error) {
      this.logger.error(`Error handling medicine query: ${error.message}`);
      return {
        answer: `I'm having trouble accessing your prescription information right now. 

📞 **Try these alternatives:**
• Contact your pharmacist
• Ask your doctor about your prescriptions  
• Check with your healthcare provider

For urgent medicine concerns, contact a healthcare professional.`,
      confidence: 0.3,
      sources: ['System Error'],
      escalate: true,
      reasoning: 'Error accessing prescription system'
    };
    }
  }

  // Add method to handle "who prescribed" queries
  private async handleWhoPrescribedQuery(question: string, user: User): Promise<BotResponse> {
    const prescriptions = await this.getUserPrescriptions(user.id);
    
    // Extract prescription name from question
    const prescriptionNameMatch = question.match(/who prescribed (.+?)(?:\?|$)/i);
    if (!prescriptionNameMatch) {
      return {
        answer: `📋 **Prescription Information**

To find who prescribed a specific prescription, ask like:
• "Who prescribed [prescription name]?"
• "Which doctor gave me [prescription name]?"

📝 **Your prescriptions:** ${prescriptions.map(p => p.name).join(', ')}`,
        confidence: 0.7,
        sources: ['Prescription Database'],
        escalate: false,
        reasoning: 'Need specific prescription name'
      };
    }

    const searchName = prescriptionNameMatch[1].toLowerCase();
    const foundPrescription = prescriptions.find(p => 
      p.name.toLowerCase().includes(searchName) || 
      searchName.includes(p.name.toLowerCase())
    );

    if (!foundPrescription) {
      return {
        answer: `🔍 **Prescription Not Found**

I couldn't find a prescription matching "${prescriptionNameMatch[1]}" in your records.

📝 **Your prescriptions:** ${prescriptions.map(p => p.name).join(', ')}

Try asking with the exact prescription name.`,
        confidence: 0.8,
        sources: ['Prescription Database'],
        escalate: false,
        reasoning: 'Prescription not found'
      };
    }

    const doctorName = foundPrescription.prescribedBy?.user 
      ? `Dr. ${foundPrescription.prescribedBy.user.firstName} ${foundPrescription.prescribedBy.user.lastName}`
      : 'Unknown Doctor';
    const prescribedDate = new Date(foundPrescription.prescribedDate).toLocaleDateString();

    return {
      answer: `👨‍⚕️ **Prescription Information**

**${foundPrescription.name}** was prescribed by:

**Doctor:** ${doctorName}
📅 **Date:** ${prescribedDate}
💊 **Medicines:** ${foundPrescription.medicines.length} item(s)
📝 **Contains:** ${foundPrescription.medicines.map(m => m.name).join(', ')}

Need more details about any of these medicines? Just ask!`,
      confidence: 0.95,
      sources: ['Prescription Database'],
      escalate: false,
      reasoning: 'Successfully found prescription information'
    };
  }

  // Add general medicine help
  private handleMedicineHelp(): BotResponse {
    return {
      answer: `💊 **Medicine Information Help**

**What you can ask:**
• "My prescriptions" - See all your prescriptions
• "My medicines" - View all your medications  
• "Who prescribed [prescription name]?" - Find prescribing doctor
• "What does [medicine name] do?" - Medicine purpose
• "Side effects of [medicine name]" - Safety information

**Quick tip:** Be specific with medicine or prescription names for best results!`,
      confidence: 0.8,
      sources: ['Medicine Information System'],
      escalate: false,
      reasoning: 'General medicine help provided'
    };
  }

  private async getUserPrescriptions(userId: string): Promise<any[]> {
    try {
      // Use your existing findAll method instead of the non-existent methods
      const user = { id: userId } as User;
      const prescriptions = await this.prescriptionService.findAll(user);
      
      // Format the data based on your actual entity structure
      return prescriptions.map(prescription => ({
        id: prescription.id,
        name: prescription.name,
        prescribedBy: prescription.prescribedBy,
        prescribedDate: prescription.date, // Use 'date' instead of 'createdAt'
        // Change 'medications' to the correct property name from your entity:
        medicines: prescription.medications?.map(pm => ({
          id: pm.medicineId,
          name: pm.medicineId, // You'll need to resolve this to actual name
          dosage: pm.dosage,
          frequency: pm.frequency,
          duration: pm.duration,
          quantity: pm.quantity
        })) || []
      }));
    } catch (error) {
      this.logger.error(`Error getting user prescriptions: ${error.message}`);
      return [];
    }
  }

  private async handlePrescriptionListQuery(prescriptions: any[]): Promise<BotResponse> {
    if (prescriptions.length === 0) {
      return {
        answer: `📋 **No Prescriptions Found**

You currently don't have any prescriptions in your records.

💡 **This could mean:**
• Your prescriptions haven't been added to the system yet
• You may need to visit a doctor for a consultation
• Ask your doctor to upload your prescription

Would you like help scheduling an appointment with a doctor?`,
        confidence: 0.9,
        sources: ['Prescription Database'],
        escalate: false,
        reasoning: 'No prescriptions found for user'
      };
    }

    let prescriptionList = '';
    prescriptions.forEach((prescription, index) => {
      const doctorName = prescription.prescribedBy?.user 
        ? `Dr. ${prescription.prescribedBy.user.firstName} ${prescription.prescribedBy.user.lastName}`
        : 'Unknown Doctor';
      const prescribedDate = new Date(prescription.prescribedDate).toLocaleDateString();
      const medicineCount = prescription.medicines.length;

      prescriptionList += `${index + 1}. **${prescription.name}**
   👨‍⚕️ Prescribed by: ${doctorName}
   📅 Date: ${prescribedDate}
   💊 Contains: ${medicineCount} medicine(s)
   📝 Medicines: ${prescription.medicines.map(m => m.name).join(', ')}

`;
    });

    return {
      answer: `📋 **Your Prescriptions**

${prescriptionList}

💡 **Need More Info?**
• Ask about specific medicines: "What does [medicine name] do?"
• Find prescribing doctor: "Who prescribed [prescription name]?"
• Learn about side effects: "Side effects of [medicine name]"

${prescriptions.length > 5 ? `\n📊 Showing all ${prescriptions.length} prescriptions` : ''}`,
      confidence: 0.95,
      sources: ['Prescription Database'],
      escalate: false,
      reasoning: 'Successfully retrieved user prescriptions'
    };
  }

  private async handleUserPrescriptionMedicines(user: User): Promise<BotResponse> {
    try {
      const prescriptions = await this.getUserPrescriptions(user.id);
      
      if (prescriptions.length === 0) {
        return {
          answer: `💊 **No Medicines Found**

You don't have any medicines in your prescriptions yet.

🏥 **To get medicines:**
• Schedule an appointment with a doctor
• Get a prescription from your healthcare provider
• Have your doctor add prescriptions to the system

Would you like help scheduling an appointment?`,
          confidence: 0.9,
          sources: ['Medicine Database'],
          escalate: false,
          reasoning: 'No medicines found for user'
        };
      }

      // Collect all medicines from all prescriptions
      const allMedicines = prescriptions.flatMap(prescription => 
        prescription.medicines.map(medicine => ({
          ...medicine,
          prescriptionName: prescription.name,
          prescribedBy: prescription.prescribedBy?.user 
            ? `Dr. ${prescription.prescribedBy.user.firstName} ${prescription.prescribedBy.user.lastName}`
            : 'Unknown Doctor'
        }))
      );

      if (allMedicines.length === 0) {
        return {
          answer: `💊 **No Medicines in Prescriptions**

Your prescriptions don't contain any medicines yet. This might mean:
• Prescriptions are pending medicine assignment
• Contact your doctor to add medicines to your prescriptions

📞 Contact your healthcare provider for more information.`,
          confidence: 0.8,
          sources: ['Medicine Database'],
          escalate: false,
          reasoning: 'Prescriptions exist but no medicines found'
        };
      }

      let medicineList = '';
      allMedicines.forEach((medicine, index) => {
        medicineList += `${index + 1}. **${medicine.name}**
   💊 Dosage: ${medicine.dosage || 'Not specified'}
   ⏰ Frequency: ${medicine.frequency || 'Not specified'}
   📅 Duration: ${medicine.duration || 'Not specified'}
   📋 From: ${medicine.prescriptionName}
   👨‍⚕️ Prescribed by: ${medicine.prescribedBy}

`;
      });

      return {
        answer: `💊 **Your Medicines**

${medicineList}

💡 **Need More Info?**
• Ask about specific medicine: "What does [medicine name] do?"
• Learn about side effects: "Side effects of [medicine name]"
• Find usage instructions: "How to take [medicine name]"

📊 Total: ${allMedicines.length} medicine(s) from ${prescriptions.length} prescription(s)`,
      confidence: 0.95,
      sources: ['Medicine Database'],
      escalate: false,
      reasoning: 'Successfully retrieved user medicines'
    };

    } catch (error) {
      this.logger.error(`Error handling user prescription medicines: ${error.message}`);
      return {
        answer: `I'm having trouble accessing your medicine information right now.

📞 **Try these alternatives:**
• Contact your pharmacist
• Ask your doctor about your medicines
• Check with your healthcare provider

For urgent medicine concerns, contact a healthcare professional.`,
        confidence: 0.3,
        sources: ['System Error'],
        escalate: true,
        reasoning: 'Error accessing medicine system'
      };
    }
  }

  private extractMedicineName(question: string): string | null {
    // Try to extract medicine name from common question patterns
    const patterns = [
      /what does (.+?) do/i,
      /side effects of (.+?)(?:\?|$)/i,
      /what is (.+?)(?:\?|$)/i,
      /how to take (.+?)(?:\?|$)/i,
      /(.+?) effects/i
    ];

    for (const pattern of patterns) {
      const match = question.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return null;
  }

  private async handleSpecificMedicineQuery(medicineName: string, question: string, user: User): Promise<BotResponse> {
    try {
      // First check if user has this medicine in their prescriptions
      const prescriptions = await this.getUserPrescriptions(user.id);
      const userMedicine = prescriptions.flatMap(p => p.medicines)
        .find(m => m.name.toLowerCase().includes(medicineName.toLowerCase()) || 
                   medicineName.toLowerCase().includes(m.name.toLowerCase()));

      // Try to get medicine info from the medicine service
      const medicines = await this.medicineService.findAll();
      const medicineInfo = medicines.find(m => 
        m.name.toLowerCase().includes(medicineName.toLowerCase()) || 
        medicineName.toLowerCase().includes(m.name.toLowerCase())
      );

      if (!medicineInfo && !userMedicine) {
        return {
          answer: `🔍 **Medicine Not Found**

I couldn't find information about "${medicineName}" in our database or your prescriptions.

💡 **Try:**
• Check the spelling of the medicine name
• Ask about medicines in your prescriptions: "my medicines"
• Contact your pharmacist for detailed information

For specific medicine questions, your pharmacist or doctor can provide the most accurate information.`,
          confidence: 0.7,
          sources: ['Medicine Database'],
          escalate: false,
          reasoning: 'Medicine not found in database or user prescriptions'
        };
      }

      const medicine = medicineInfo || userMedicine;
      const questionLower = question.toLowerCase();

      let answer = `💊 **${medicine.name}**\n\n`;

      if (questionLower.includes('side effects')) {
        answer += `⚠️ **Common Side Effects:**
${medicine.sideEffects || 'Side effect information not available in our database.'}

🚨 **Important:** If you experience any concerning side effects, contact your healthcare provider immediately.`;
      } else if (questionLower.includes('what does') || questionLower.includes('what is')) {
        answer += `📋 **Purpose:**
${medicine.description || 'Medicine description not available in our database.'}

💊 **Category:** ${medicine.category || 'Not specified'}`;
      } else {
        // General medicine information
        answer += `📋 **Purpose:** ${medicine.description || 'Not available'}
💊 **Category:** ${medicine.category || 'Not specified'}
⚠️ **Side Effects:** ${medicine.sideEffects || 'Not available'}`;

        if (userMedicine) {
          answer += `\n\n📝 **Your Prescription Details:**
💊 Dosage: ${userMedicine.dosage || 'Not specified'}
⏰ Frequency: ${userMedicine.frequency || 'Not specified'}
📅 Duration: ${userMedicine.duration || 'Not specified'}`;
        }
      }

      return {
        answer: answer + `\n\n⚠️ **Always consult your healthcare provider or pharmacist for personalized medical advice about your medications.**`,
        confidence: medicineInfo ? 0.9 : 0.7,
        sources: ['Medicine Database', 'Prescription Records'],
        escalate: false,
        reasoning: `Medicine information provided for ${medicine.name}`
      };

    } catch (error) {
      this.logger.error(`Error handling specific medicine query: ${error.message}`);
      return {
        answer: `I'm having trouble finding information about "${medicineName}" right now.

📞 **For accurate medicine information:**
• Contact your pharmacist
• Ask your prescribing doctor
• Check the medicine packaging or leaflet

For urgent medicine concerns, contact a healthcare professional immediately.`,
        confidence: 0.3,
        sources: ['System Error'],
        escalate: true,
        reasoning: 'Error accessing medicine information'
      };
    }
  }

  private isSimpleGreeting(message: string): boolean {
    const lowerMessage = message.toLowerCase().trim();
    const greetings = [
      'hello', 'hi', 'hey', 'good morning', 'good afternoon', 
      'good evening', 'how are you', 'what\'s up', 'greetings'
    ];
    
    return greetings.some(greeting => 
      lowerMessage === greeting || 
      lowerMessage.startsWith(greeting + ' ') ||
      lowerMessage.endsWith(' ' + greeting)
    );
  }
}