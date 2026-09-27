import mongoose from 'mongoose';

const safetyDocSchema = new mongoose.Schema({
  sourceTitle: {
    type: String,
    required: [true, 'Source title is required'],
    trim: true
  },
  chunkText: {
    type: String,
    required: [true, 'Chunk text is required'],
    maxLength: [2000, 'Chunk text cannot exceed 2000 characters']
  },
  embedding: [{
    type: Number,
    required: [true, 'Embedding vector is required']
  }],
  sourceUrl: {
    type: String,
    trim: true
  },
  // Metadata for better organization
  category: {
    type: String,
    enum: ['food_safety', 'storage', 'handling', 'guidelines', 'regulations', 'shelf_life'],
    required: [true, 'Category is required']
  },
  language: {
    type: String,
    default: 'en'
  },
  // Versioning and source info
  sourceType: {
    type: String,
    enum: ['FSSAI', 'WHO', 'FDA', 'government', 'research', 'standard'],
    required: [true, 'Source type is required']
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  // Search optimization
  keywords: [String],
  relevanceScore: {
    type: Number,
    default: 1.0,
    min: 0,
    max: 1
  }
}, {
  timestamps: true
});

// Indexes for vector search and performance
safetyDocSchema.index({ category: 1 });
safetyDocSchema.index({ sourceType: 1 });
safetyDocSchema.index({ keywords: 1 });
safetyDocSchema.index({ lastUpdated: -1 });

// Note: Vector/embedding search is handled in-memory via cosine similarity
// MongoDB Atlas Vector Search index would be configured separately in Atlas UI

export default mongoose.model('SafetyDoc', safetyDocSchema);