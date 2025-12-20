/**
 * Script de test pour vérifier la connexion Supabase
 * Exécutez avec: npx tsx scripts/test-supabase-connection.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Charger les variables d'environnement
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  console.warn('⚠️  Fichier .env non trouvé. Utilisation des variables d\'environnement système.');
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_PUBLISHABLE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

async function testConnection() {
  console.log('🔍 Test de connexion Supabase...\n');

  // Vérifier les variables d'environnement
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    console.error('❌ Erreur: Variables d\'environnement manquantes');
    console.log('\nVérifiez que votre fichier .env contient:');
    console.log('  VITE_SUPABASE_URL=https://votre-project.supabase.co');
    console.log('  VITE_SUPABASE_PUBLISHABLE_KEY=votre_anon_key\n');
    process.exit(1);
  }

  console.log('✅ Variables d\'environnement trouvées');
  console.log(`   URL: ${SUPABASE_URL.substring(0, 30)}...`);
  console.log(`   Key: ${SUPABASE_PUBLISHABLE_KEY.substring(0, 20)}...\n`);

  // Créer le client Supabase
  const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

  try {
    // Test 1: Vérifier la connexion
    console.log('📡 Test de connexion...');
    const { data: healthData, error: healthError } = await supabase
      .from('analysis_history')
      .select('count')
      .limit(1);

    if (healthError) {
      if (healthError.code === 'PGRST116') {
        console.error('❌ Erreur: La table "analysis_history" n\'existe pas');
        console.log('\n💡 Solution: Exécutez la migration SQL dans Supabase Dashboard > SQL Editor\n');
        process.exit(1);
      } else {
        throw healthError;
      }
    }

    console.log('✅ Connexion réussie\n');

    // Test 2: Vérifier la structure de la table
    console.log('📊 Test de la structure de la table...');
    const { data: testData, error: testError } = await supabase
      .from('analysis_history')
      .select('*')
      .limit(1);

    if (testError) {
      throw testError;
    }

    console.log('✅ Structure de la table correcte\n');

    // Test 3: Test d'insertion (optionnel)
    console.log('✍️  Test d\'insertion...');
    const testRecord = {
      fund_name: 'Test Fund',
      startup_name: 'Test Startup',
      investment_thesis: { test: true },
      pitch_deck: [{ title: 'Test', content: 'Test content' }],
    };

    const { data: insertData, error: insertError } = await supabase
      .from('analysis_history')
      .insert(testRecord)
      .select()
      .single();

    if (insertError) {
      if (insertError.code === '42501') {
        console.error('❌ Erreur: Permissions insuffisantes (RLS)');
        console.log('\n💡 Solution: Vérifiez les politiques RLS dans Supabase Dashboard\n');
        process.exit(1);
      } else {
        throw insertError;
      }
    }

    console.log('✅ Insertion réussie');

    // Nettoyer le test
    if (insertData?.id) {
      await supabase
        .from('analysis_history')
        .delete()
        .eq('id', insertData.id);
      console.log('🧹 Données de test nettoyées\n');
    }

    console.log('🎉 Tous les tests sont passés ! Votre configuration Supabase est correcte.\n');
  } catch (error: any) {
    console.error('❌ Erreur lors du test:', error.message);
    console.error('\nDétails:', error);
    process.exit(1);
  }
}

testConnection();

