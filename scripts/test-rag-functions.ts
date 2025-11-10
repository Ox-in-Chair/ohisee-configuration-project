/**
 * Test RAG Search Functions
 * Check if search_procedures and search_similar_cases functions exist
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFunctions() {
  console.log('\n🔍 Testing RAG Search Functions');
  console.log('='.repeat(70));

  // Test 1: Check if search_procedures exists
  console.log('\n📄 Testing search_procedures...');
  try {
    const mockEmbedding = new Array(1536).fill(0);
    const { data, error } = await supabase.rpc('search_procedures', {
      query_embedding: mockEmbedding,
      match_limit: 3,
      match_threshold: 0.0
    });

    if (error) {
      console.error('❌ search_procedures FAILED:', error.message);
    } else {
      console.log(`✅ search_procedures EXISTS - returned ${data?.length ?? 0} results`);
    }
  } catch (error) {
    console.error('❌ search_procedures ERROR:', error);
  }

  // Test 2: Check if search_similar_cases exists
  console.log('\n📄 Testing search_similar_cases...');
  try {
    const mockEmbedding = new Array(1536).fill(0);
    const { data, error } = await supabase.rpc('search_similar_cases', {
      query_embedding: mockEmbedding,
      case_type: 'nca',
      match_limit: 3,
      match_threshold: 0.0,
      min_quality_score: 75
    });

    if (error) {
      console.error('❌ search_similar_cases FAILED:', error.message);
    } else {
      console.log(`✅ search_similar_cases EXISTS - returned ${data?.length ?? 0} results`);
    }
  } catch (error) {
    console.error('❌ search_similar_cases ERROR:', error);
  }

  console.log('\n' + '='.repeat(70));
}

testFunctions()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
