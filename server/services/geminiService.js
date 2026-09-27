import { GoogleGenerativeAI } from '@google/generative-ai';

class GeminiService {
  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      console.warn('⚠️ GEMINI_API_KEY not found. RAG features will be limited.');
      this.client = null;
      return;
    }

    try {
      this.client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      this.model = this.client.getGenerativeModel({ model: 'gemini-1.5-flash' });
      this.embeddingModel = this.client.getGenerativeModel({ model: 'text-embedding-004' });
      console.log('✅ Gemini service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Gemini:', error.message);
      this.client = null;
    }
  }

  /**
   * Generate embeddings for text using Gemini
   */
  async generateEmbedding(text) {
    if (!this.client) {
      throw new Error('Gemini service not available');
    }

    try {
      const result = await this.embeddingModel.embedContent(text);
      return result.embedding.values;
    } catch (error) {
      console.error('Embedding generation error:', error);
      throw new Error('Failed to generate embedding');
    }
  }

  /**
   * Generate text using Gemini with context
   */
  async generateText(prompt, context = null) {
    if (!this.client) {
      throw new Error('Gemini service not available');
    }

    try {
      const fullPrompt = context 
        ? `Context: ${context}\n\nQuestion: ${prompt}\n\nPlease provide a helpful answer based on the context provided.`
        : prompt;

      const result = await this.model.generateContent(fullPrompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Text generation error:', error);
      throw new Error('Failed to generate text');
    }
  }

  /**
   * RAG Query: Retrieve relevant documents and generate grounded answer
   */
  async ragQuery(question, relevantDocs = []) {
    if (!this.client) {
      return {
        answer: 'RAG service unavailable - Gemini API key not configured',
        sources: [],
        confidence: 0
      };
    }

    try {
      // Prepare context from retrieved documents
      const context = relevantDocs.map((doc, index) => 
        `[Source ${index + 1}: ${doc.sourceTitle}]\n${doc.chunkText}`
      ).join('\n\n');

      const prompt = `You are a food safety expert assistant. Answer the user's question based ONLY on the provided context from official food safety guidelines. 

Context from official sources:
${context}

User Question: ${question}

Instructions:
- Answer based ONLY on the provided context
- If the context doesn't contain relevant information, say "I don't have specific information about this in my knowledge base"
- Always cite which source(s) you're referencing
- Be concise but informative
- Focus on food safety best practices

Answer:`;

      const answer = await this.generateText(prompt);

      return {
        answer: answer,
        sources: relevantDocs.map(doc => ({
          title: doc.sourceTitle,
          url: doc.sourceUrl || 'Internal guideline'
        })),
        confidence: relevantDocs.length > 0 ? 0.8 : 0.3,
        model: 'gemini-1.5-flash',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('RAG query error:', error);
      return {
        answer: 'Sorry, I encountered an error processing your question. Please try again.',
        sources: [],
        confidence: 0,
        error: error.message
      };
    }
  }

  /**
   * Calculate similarity between two embedding vectors
   */
  cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Check if service is available
   */
  isAvailable() {
    return this.client !== null;
  }
}

// Export singleton instance
const geminiService = new GeminiService();
export default geminiService;