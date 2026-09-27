import SafetyDoc from '../models/SafetyDoc.js';
import geminiService from './geminiService.js';

class RAGService {
  constructor() {
    this.initialized = false;
    // NOTE: Do NOT call init() here — MongoDB may not be connected yet.
    // initialize() is called explicitly by server.js after connectDB().
  }

  async init() {
    try {
      // Check if we have safety documents in the database
      const docCount = await SafetyDoc.countDocuments();
      
      if (docCount === 0) {
        console.log('🌱 Seeding RAG knowledge base...');
        await this.seedKnowledgeBase();
      }
      
      this.initialized = true;
      console.log(`✅ RAG service initialized with ${docCount || await SafetyDoc.countDocuments()} documents`);
    } catch (error) {
      console.error('❌ RAG service initialization failed:', error);
    }
  }

  // Alias for consistency with MCP pattern
  async initialize() {
    await this.init();
  }

  /**
   * Seed the knowledge base with food safety documents
   */
  async seedKnowledgeBase() {
    const foodSafetyTexts = [
      // FSSAI Guidelines
      {
        title: 'FSSAI Food Storage Guidelines',
        category: 'storage',
        sourceType: 'FSSAI',
        text: 'Perishable foods including dairy, meat, and seafood must be stored at 0-4°C in refrigeration. Maximum shelf life is 3-4 days for meat and fish, 7 days for dairy products. Keep in airtight containers and separate from raw vegetables to prevent cross-contamination.'
      },
      {
        title: 'FSSAI Cooked Food Guidelines',
        category: 'food_safety',
        sourceType: 'FSSAI', 
        text: 'Cooked foods should be cooled to room temperature within 2 hours before refrigeration. Store at 0-4°C and consume within 24 hours for safety. Never leave cooked food at room temperature for more than 2 hours as bacterial growth accelerates between 5-60°C danger zone.'
      },
      {
        title: 'FSSAI Temperature Control',
        category: 'handling',
        sourceType: 'FSSAI',
        text: 'Hot foods must be kept above 60°C and cold foods below 5°C during transportation and service. Use insulated containers and monitor temperatures regularly. Avoid temperature danger zone of 5-60°C where bacteria multiply rapidly.'
      },

      // WHO Guidelines
      {
        title: 'WHO Five Keys to Safer Food',
        category: 'food_safety',
        sourceType: 'WHO',
        text: 'WHO recommends: Keep clean - wash hands and surfaces. Separate raw and cooked foods. Cook thoroughly to 70°C minimum. Keep food at safe temperatures below 5°C or above 60°C. Use safe water and raw materials from trusted sources.'
      },
      {
        title: 'WHO Food Storage Recommendations',
        category: 'storage',
        sourceType: 'WHO',
        text: 'Store raw meat, poultry and seafood separately from other foods. Use bottom shelf of refrigerator to prevent drips. Maintain refrigerator temperature at 4°C or below. Freeze foods at -18°C. Follow first-in-first-out principle.'
      },

      // Shelf Life Guidelines
      {
        title: 'Food Shelf Life Standards',
        category: 'shelf_life',
        sourceType: 'standard',
        text: 'Rice and grains: 7 days refrigerated, 30 days frozen. Cooked vegetables: 3-5 days refrigerated. Dairy products: 5-7 days refrigerated. Bread and baked goods: 2-3 days room temperature, 7 days refrigerated. Always check for signs of spoilage before consumption.'
      },
      {
        title: 'Danger Zone Temperature Guidelines',
        category: 'food_safety',
        sourceType: 'standard',
        text: 'Bacteria multiply rapidly between 5°C and 60°C (danger zone). Perishable foods should not remain in this temperature range for more than 2 hours. In hot weather above 32°C, limit exposure to 1 hour maximum.'
      },

      // Cross-contamination Prevention
      {
        title: 'Cross-Contamination Prevention',
        category: 'handling',
        sourceType: 'FSSAI',
        text: 'Use separate cutting boards for raw meat and vegetables. Store raw meat on bottom refrigerator shelf. Wash hands for 20 seconds with soap between handling different foods. Clean and sanitize all surfaces and utensils after use.'
      },

      // Specific Food Types
      {
        title: 'Dairy Product Safety',
        category: 'food_safety',
        sourceType: 'FSSAI',
        text: 'Milk and dairy products are highly perishable. Store at 2-4°C immediately after opening. Pasteurized milk lasts 5-7 days refrigerated. Curd and yogurt last 7-10 days. Never consume dairy products that smell sour or have unusual texture.'
      },
      {
        title: 'Rice and Grain Safety',
        category: 'food_safety',
        sourceType: 'WHO',
        text: 'Cooked rice is particularly prone to Bacillus cereus bacteria. Cool quickly and refrigerate within 1 hour of cooking. Consume refrigerated rice within 24 hours. Reheat thoroughly to steaming hot (74°C) before serving. Never leave cooked rice at room temperature.'
      },

      // Donation Assessment
      {
        title: 'Food Donation Safety Assessment',
        category: 'guidelines',
        sourceType: 'standard',
        text: 'Assess food donations for: visual quality (no mold, discoloration), smell (no off odors), temperature (maintained cold/hot chain), packaging integrity, and time since preparation. Reject donations that spent more than 2 hours in danger zone or show signs of spoilage.'
      },
      {
        title: 'Transportation Safety Requirements',
        category: 'handling',
        sourceType: 'FSSAI',
        text: 'During food transportation: maintain cold chain for refrigerated items, use insulated containers, monitor temperatures, complete delivery within 4 hours maximum, avoid cross-contamination between different food types, and document temperature logs.'
      }
    ];

    // Generate embeddings and save documents
    for (const doc of foodSafetyTexts) {
      try {
        let embedding = [];
        
        if (geminiService.isAvailable()) {
          embedding = await geminiService.generateEmbedding(doc.text);
        } else {
          // Fallback: create dummy embedding for structure
          embedding = Array.from({ length: 768 }, () => Math.random() - 0.5);
        }

        const safetyDoc = new SafetyDoc({
          sourceTitle: doc.title,
          chunkText: doc.text,
          embedding: embedding,
          category: doc.category,
          sourceType: doc.sourceType,
          keywords: doc.text.toLowerCase().split(' ').filter(word => word.length > 3)
        });

        await safetyDoc.save();
        console.log(`📄 Seeded: ${doc.title}`);
      } catch (error) {
        console.error(`❌ Failed to seed ${doc.title}:`, error.message);
      }
    }

    console.log('✅ Knowledge base seeding completed');
  }

  /**
   * Query the RAG system
   */
  async query(question) {
    try {
      if (!this.initialized) {
        return {
          success: false,
          error: 'RAG service not initialized'
        };
      }

      // Retrieve relevant documents
      const relevantDocs = await this.retrieveRelevantDocs(question);
      
      // Generate answer using Gemini
      let response;
      
      if (geminiService.isAvailable()) {
        response = await geminiService.ragQuery(question, relevantDocs);
      } else {
        // Fallback response if Gemini not available
        response = {
          answer: 'RAG service is available but Gemini API is not configured. This is a fallback response based on retrieved documents.',
          sources: relevantDocs.map(doc => ({ title: doc.sourceTitle, url: 'Internal guideline' })),
          confidence: 0.5
        };
      }

      return {
        success: true,
        question: question,
        answer: response.answer,
        sources: response.sources || [],
        confidence: response.confidence || 0.5,
        retrievedDocs: relevantDocs.length,
        model: response.model || 'fallback',
        cost: 'FREE',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('RAG query error:', error);
      return {
        success: false,
        error: error.message,
        question: question
      };
    }
  }

  /**
   * Retrieve relevant documents using embedding similarity or keyword matching
   */
  async retrieveRelevantDocs(question, topK = 3) {
    try {
      let relevantDocs = [];

      if (geminiService.isAvailable()) {
        // Use semantic search with embeddings
        const questionEmbedding = await geminiService.generateEmbedding(question);
        
        // Get all documents
        const allDocs = await SafetyDoc.find({});
        
        // Calculate similarities
        const similarities = allDocs.map(doc => ({
          doc,
          similarity: geminiService.cosineSimilarity(questionEmbedding, doc.embedding)
        }));

        // Sort by similarity and take top K
        similarities.sort((a, b) => b.similarity - a.similarity);
        relevantDocs = similarities.slice(0, topK).map(item => item.doc);
        
      } else {
        // Fallback: keyword-based search
        const keywords = question.toLowerCase().split(' ').filter(word => word.length > 3);
        
        const searchQuery = {
          $or: [
            { keywords: { $in: keywords } },
            { chunkText: { $regex: keywords.join('|'), $options: 'i' } },
            { sourceTitle: { $regex: keywords.join('|'), $options: 'i' } }
          ]
        };

        relevantDocs = await SafetyDoc.find(searchQuery).limit(topK);
      }

      return relevantDocs;

    } catch (error) {
      console.error('Document retrieval error:', error);
      return [];
    }
  }

  /**
   * Assess food donation safety
   */
  async assessDonationSafety(donationData) {
    const assessmentQuery = `
      Is it safe to donate ${donationData.foodName}?
      Food type: ${donationData.foodType}
      Prepared: ${donationData.prepTime}
      Storage: ${donationData.storageTemp}
      Quantity: ${donationData.quantity} ${donationData.unit}
      
      Please assess safety for donation and provide recommendations.
    `;

    const result = await this.query(assessmentQuery);
    
    return {
      ...result,
      donationId: donationData._id,
      assessmentType: 'safety',
      recommendation: result.success ? 'See detailed answer' : 'Unable to assess - please consult guidelines'
    };
  }
}

// Export singleton instance
const ragService = new RAGService();
export default ragService;