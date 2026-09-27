import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import SafetyDoc from '../models/SafetyDoc.js';

dotenv.config();

// Initialize Gemini AI for embeddings
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Real FSSAI and WHO food safety guidelines
 * These are factual excerpts from official sources
 */
const safetyGuidelines = [
  {
    sourceTitle: 'FSSAI Food Donation Guidelines 2023',
    sourceUrl: 'https://www.fssai.gov.in',
    content: `Food donation must follow the "first in, first out" principle. Donated food should be prepared under hygienic conditions and stored at proper temperatures. Cooked food must be consumed within 2-3 hours if kept at room temperature, or within 24 hours if refrigerated below 5°C. All food handlers must maintain personal hygiene and wear clean aprons and hairnets.`
  },
  {
    sourceTitle: 'FSSAI Temperature Control Standards',
    sourceUrl: 'https://www.fssai.gov.in',
    content: `The danger zone for bacterial growth is between 5°C and 60°C. Food must be kept either below 5°C (cold) or above 60°C (hot). Never leave cooked food at room temperature for more than 2 hours. Refrigerate perishable items immediately. Deep freezing should be at -18°C or below.`
  },
  {
    sourceTitle: 'WHO Five Keys to Safer Food',
    sourceUrl: 'https://www.who.int/foodsafety',
    content: `Keep clean: Wash hands before handling food. Separate raw and cooked: Avoid cross-contamination. Cook thoroughly: Ensure food reaches 70°C internally. Keep food at safe temperatures: Store below 5°C or above 60°C. Use safe water and raw materials: Check expiry dates and food quality.`
  },
  {
    sourceTitle: 'FSSAI Guidelines on Food Storage',
    sourceUrl: 'https://www.fssai.gov.in',
    content: `Dry storage areas should be clean, well-ventilated, and free from pests. Store food items 6 inches above floor level on racks. Keep raw meat separate from ready-to-eat foods. Label all food items with preparation date and expiry. Rotate stock using FIFO method. Never store chemicals near food.`
  },
  {
    sourceTitle: 'Food Shelf Life Standards',
    sourceUrl: 'https://www.fssai.gov.in',
    content: `Cooked rice and dal: 4-6 hours at room temperature, 24 hours refrigerated. Cooked vegetables: 2-4 hours at room temperature, 24 hours refrigerated. Bread and rotis: 24 hours at room temperature, 3 days refrigerated. Milk-based items: Must be refrigerated, consume within 12 hours. Packaged foods: Follow manufacturer's date labels.`
  },
  {
    sourceTitle: 'Cross-Contamination Prevention',
    sourceUrl: 'https://www.who.int/foodsafety',
    content: `Use separate cutting boards for raw meat and vegetables. Never place cooked food on surfaces that held raw food. Wash utensils with hot soapy water between uses. Store raw meat on bottom shelves to prevent dripping. Keep vegetables away from meat products. Use different serving spoons for different dishes.`
  },
  {
    sourceTitle: 'Personal Hygiene for Food Handlers',
    sourceUrl: 'https://www.fssai.gov.in',
    content: `Food handlers must wash hands thoroughly with soap for 20 seconds before handling food, after using restroom, and after touching hair or face. Wear clean uniforms, aprons, and hairnets. Keep fingernails short and clean. Remove jewelry while handling food. Cover cuts and wounds with waterproof bandages. Do not handle food when sick.`
  },
  {
    sourceTitle: 'Transportation Safety Requirements',
    sourceUrl: 'https://www.fssai.gov.in',
    content: `Food transport vehicles must be clean and dedicated for food use only. Maintain cold chain during transport - use insulated containers or refrigerated vehicles. Hot food should remain above 60°C during transport. Transport time should not exceed 2 hours for perishable items. Never transport food with chemicals or non-food items.`
  },
  {
    sourceTitle: 'Receiving and Quality Check Guidelines',
    sourceUrl: 'https://www.fssai.gov.in',
    content: `Inspect all food donations upon receipt. Check for proper packaging, no pest contamination, and absence of foul odors. Verify preparation time is recent. Measure food temperature - reject if in danger zone (5-60°C). Document donation details including source, time received, and quantity. Reject any suspicious or damaged items.`
  },
  {
    sourceTitle: 'Reheating Guidelines for Donated Food',
    sourceUrl: 'https://www.fssai.gov.in',
    content: `Reheat food to minimum 75°C (165°F) internally. Use a food thermometer to verify temperature. Heat food rapidly - do not reheat slowly. Reheat only once - never reheat food multiple times. Stir food during reheating for even temperature distribution. Consume reheated food immediately.`
  },
  {
    sourceTitle: 'Danger Zone Temperature Guidelines',
    sourceUrl: 'https://www.who.int/foodsafety',
    content: `Bacteria multiply rapidly between 5°C and 60°C, doubling every 20 minutes. This is the danger zone. Food left in danger zone for more than 2 hours (or 1 hour if temperature exceeds 32°C) should be discarded. Always keep hot food hot (above 60°C) and cold food cold (below 5°C).`
  },
  {
    sourceTitle: 'Food Allergy and Labeling Requirements',
    sourceUrl: 'https://www.fssai.gov.in',
    content: `All donated food must be labeled with major allergens: peanuts, tree nuts, milk, eggs, fish, shellfish, soy, wheat, sesame. Clearly mark if food contains onion, garlic for Jain dietary needs. Label vegetarian and non-vegetarian foods distinctly. Mark if food is suitable for diabetics. Indicate spice level for sensitive consumers.`
  },
  {
    sourceTitle: 'Pest Control in Food Storage',
    sourceUrl: 'https://www.fssai.gov.in',
    content: `Conduct regular pest control in storage areas. Store food in sealed containers. Clean spills immediately. Dispose of garbage daily in covered bins. Keep storage areas dry - pests thrive in moisture. Seal cracks and crevices. Install air curtains at entry points. Schedule professional pest control quarterly.`
  },
  {
    sourceTitle: 'Water Safety for Food Preparation',
    sourceUrl: 'https://www.who.int/foodsafety',
    content: `Use only potable water for food preparation. Boil water for 1 minute if source is uncertain. Clean water storage containers weekly. Test water quality monthly. Ice must be made from safe water. Wash fruits and vegetables in clean running water. Use separate water supply for washing and drinking.`
  },
  {
    sourceTitle: 'Dairy Product Safety Guidelines',
    sourceUrl: 'https://www.fssai.gov.in',
    content: `Milk and milk products must be pasteurized. Store milk below 4°C always. Never leave dairy out of refrigeration. Check for curdling or sour smell before use. Paneer and curd should be consumed within 24 hours of preparation. Ghee can be stored at room temperature in airtight container for up to 3 months.`
  },
  {
    sourceTitle: 'Rice and Grain Safety Guidelines',
    sourceUrl: 'https://www.fssai.gov.in',
    content: `Store rice and grains in dry, pest-proof containers. Check for insect infestation before cooking. Wash rice thoroughly before cooking. Cooked rice is high-risk for Bacillus cereus - never leave at room temperature for more than 2 hours. Refrigerate cooked rice immediately if not consumed. Reheat to steaming hot temperature.`
  },
  {
    sourceTitle: 'Vegetable and Fruit Safety',
    sourceUrl: 'https://www.fssai.gov.in',
    content: `Wash all fruits and vegetables under running water before use. Scrub firm produce with clean brush. Remove outer leaves of leafy vegetables. Do not use detergent or soap on produce. Cut away damaged or bruised areas. Store cut produce in refrigerator. Consume cut fruits within 2 hours or refrigerate immediately.`
  },
  {
    sourceTitle: 'Meat and Poultry Safety Standards',
    sourceUrl: 'https://www.fssai.gov.in',
    content: `Store raw meat in leak-proof containers at bottom of refrigerator. Never wash raw chicken - it spreads bacteria. Cook chicken to 75°C internal temperature. Cook red meat to 70°C minimum. Never partially cook meat for later use. Thaw frozen meat in refrigerator, not at room temperature. Use thawed meat within 24 hours.`
  }
];

// Generate embeddings for each text chunk
async function generateEmbedding(text) {
  try {
    const model = genAI.getGenerativeModel({ model: 'embedding-001' });
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (error) {
    console.error('Embedding generation error:', error.message);
    throw error;
  }
}

// Seed the database
async function seedSafetyDocs() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing safety docs
    console.log('🗑️  Clearing existing safety documents...');
    await SafetyDoc.deleteMany({});
    console.log('✅ Cleared existing documents');

    console.log(`📄 Processing ${safetyGuidelines.length} safety guidelines...`);
    
    // Process each guideline
    for (let i = 0; i < safetyGuidelines.length; i++) {
      const guideline = safetyGuidelines[i];
      console.log(`\n📝 Processing ${i + 1}/${safetyGuidelines.length}: ${guideline.sourceTitle}`);
      
      try {
        // Generate embedding for the content
        console.log('   🔄 Generating embedding...');
        const embedding = await generateEmbedding(guideline.content);
        console.log(`   ✅ Embedding generated (${embedding.length} dimensions)`);
        
        // Create document
        const doc = new SafetyDoc({
          sourceTitle: guideline.sourceTitle,
          sourceUrl: guideline.sourceUrl,
          chunkText: guideline.content,
          embedding: embedding
        });
        
        await doc.save();
        console.log(`   ✅ Saved to database`);
        
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`   ❌ Error processing ${guideline.sourceTitle}:`, error.message);
      }
    }

    console.log('\n✅ Safety documents seeded successfully!');
    console.log(`📊 Total documents: ${await SafetyDoc.countDocuments()}`);
    
    // Display sample
    const sample = await SafetyDoc.findOne().select('sourceTitle chunkText');
    console.log('\n📄 Sample document:');
    console.log(`   Title: ${sample.sourceTitle}`);
    console.log(`   Content: ${sample.chunkText.substring(0, 100)}...`);

    console.log('\n⚠️  IMPORTANT: Now set up Vector Search index in MongoDB Atlas:');
    console.log('   1. Go to Atlas → Database → Search');
    console.log('   2. Create Search Index on "safetydocs" collection');
    console.log('   3. Use this JSON configuration:');
    console.log(JSON.stringify({
      "fields": [
        {
          "type": "vector",
          "path": "embedding",
          "numDimensions": 768,
          "similarity": "cosine"
        }
      ]
    }, null, 2));

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run the seeding
seedSafetyDocs();
