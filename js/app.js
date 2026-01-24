// DOM Elements
const configScreen = document.getElementById('config-screen');
const chatScreen = document.getElementById('chat-screen');
const figureNameInput = document.getElementById('figure-name');
const imageUploadArea = document.getElementById('image-upload-area');
const imageInput = document.getElementById('image-input');
const imagePreview = document.getElementById('image-preview');
const previewImg = document.getElementById('preview-img');
const documentInput = document.getElementById('document-input');
const docCount = document.getElementById('doc-count');
const documentList = document.getElementById('document-list');
const documentsContainer = document.getElementById('documents-container');
const createBtn = document.getElementById('create-btn');
const resetBtn = document.getElementById('reset-btn');
const figureDisplayName = document.getElementById('figure-display-name');
const figureDisplayImg = document.getElementById('figure-display-img');
const sourcesList = document.getElementById('sources-list');
const messagesContainer = document.getElementById('messages-container');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');

// State
let state = {
  name: '',
  image: null,
  documents: [],
  conversation: [],
  chunks: [] // For storing document chunks
};

// Function to toggle between demo and API mode
function toggleAPIMode() {
  const apiToggle = document.getElementById('api-toggle');
  const modeLabel = document.getElementById('mode-label');
  if (!apiToggle) return false; // If toggle doesn't exist, default to demo

  // When checked = true, use API mode (Claude API)
  // When checked = false, use Demo mode (local matching)
  const useAPIMode = apiToggle.checked;
  console.log("API Mode:", useAPIMode ? "ON (Claude API)" : "OFF (Demo Mode)");
  localStorage.setItem('useAPIMode', useAPIMode ? 'true' : 'false');

  // Update the label to show current mode
  if (modeLabel) {
    modeLabel.textContent = useAPIMode ? 'Claude API Mode' : 'Demo Mode';
    modeLabel.style.color = useAPIMode ? '#4CAF50' : '#666';
  }

  return useAPIMode;
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  console.log("DOM fully loaded");
  
  imageUploadArea.addEventListener('click', () => {
    console.log("Image area clicked");
    imageInput.click();
  });

  imageInput.addEventListener('change', handleImageUpload);
  documentInput.addEventListener('change', handleDocumentUpload);
  createBtn.addEventListener('click', createChatbot);
  resetBtn.addEventListener('click', resetChatbot);
  sendBtn.addEventListener('click', sendMessage);
  messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  });
  
  // Set up API toggle if it exists
  const apiToggle = document.getElementById('api-toggle');
  if (apiToggle) {
    // Set initial state from localStorage (default to API mode = true)
    const savedMode = localStorage.getItem('useAPIMode');
    apiToggle.checked = savedMode === null ? true : savedMode === 'true';
    apiToggle.addEventListener('change', toggleAPIMode);
    // Initialize the label
    toggleAPIMode();
  }

  // Set up speak button
  const speakBtn = document.getElementById('speak-btn');
  if (speakBtn) {
    speakBtn.addEventListener('click', speakLastBotMessage);
  }

  // Initialize auto-speak setting
  initAutoSpeak();

  // Load voices (needed for some browsers)
  if ('speechSynthesis' in window) {
    speechSynthesis.getVoices();
    speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();
  }
});

// Functions
function handleImageUpload(e) {
  console.log("Processing image upload");
  const file = e.target.files[0];
  if (file) {
    console.log("File selected:", file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      console.log("File read successfully");
      state.image = e.target.result;
      previewImg.src = state.image;
      imagePreview.classList.remove('hidden');
      document.querySelector('.upload-placeholder').classList.add('hidden');
    };
    reader.readAsDataURL(file);
  }
}

function handleDocumentUpload(e) {
  console.log("Processing document upload");
  const files = Array.from(e.target.files);
  
  if (files.length > 0) {
    // Don't allow more than 10 documents
    if (state.documents.length + files.length > 10) {
      alert('You can only upload a maximum of 10 documents.');
      return;
    }
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        state.documents.push({
          name: file.name,
          content: e.target.result,
          type: file.type
        });
        
        updateDocumentsList();
      };
      reader.readAsText(file);
    });
  }
}

function updateDocumentsList() {
  documentsContainer.innerHTML = '';
  docCount.textContent = state.documents.length;
  
  state.documents.forEach((doc, index) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span>${doc.name}</span>
      <button class="remove-btn" data-index="${index}">Remove</button>
    `;
    documentsContainer.appendChild(li);
  });
  
  // Add event listeners to remove buttons
  document.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.getAttribute('data-index'));
      state.documents.splice(index, 1);
      updateDocumentsList();
    });
  });
  
  if (state.documents.length > 0) {
    documentList.classList.remove('hidden');
  } else {
    documentList.classList.add('hidden');
  }
}

// Process documents into chunks for better retrieval
function processDocuments() {
  state.chunks = [];
  
  state.documents.forEach(doc => {
    // Split document into chunks of roughly 1000 characters with 100 character overlap
    const chunkSize = 1000;
    const overlapSize = 100;
    const text = doc.content;
    
    for (let i = 0; i < text.length; i += chunkSize - overlapSize) {
      const chunk = text.substring(i, i + chunkSize);
      state.chunks.push({
        docName: doc.name,
        content: chunk,
        index: state.chunks.length
      });
    }
  });
  
  console.log(`Processed ${state.documents.length} documents into ${state.chunks.length} chunks`);
}

// Find relevant chunks based on query
function findRelevantChunks(query, maxChunks = 3) {
  // Simple relevance scoring based on word matching
  const queryWords = query.toLowerCase().split(/\W+/).filter(word => word.length > 3);
  
  return state.chunks
    .map(chunk => {
      const content = chunk.content.toLowerCase();
      let score = 0;
      
      queryWords.forEach(word => {
        const regex = new RegExp(word, 'g');
        const matches = content.match(regex);
        if (matches) {
          score += matches.length;
        }
      });
      
      return { ...chunk, score };
    })
    .filter(chunk => chunk.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxChunks);
}
// Three.js setup
function setupCharacter() {
  // Create scene, camera, renderer
  const container = document.getElementById('character-container');
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);
  
  // Add lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(0, 1, 1);
  scene.add(directionalLight);
  
  // Set camera position
  camera.position.z = 5;
  
  // Load character model
  const loader = new THREE.GLTFLoader();
  let character;
  
  loader.load(
    'path/to/character.glb',
    (gltf) => {
      character = gltf.scene;
      scene.add(character);
      
      // Find morph targets for lip sync
      character.traverse((node) => {
        if (node.morphTargetDictionary) {
          console.log('Morph targets found:', node.morphTargetDictionary);
          // These would include different mouth shapes
        }
      });
    },
    (xhr) => {
      console.log((xhr.loaded / xhr.total * 100) + '% loaded');
    },
    (error) => {
      console.error('Error loading model:', error);
    }
  );
  
  // Animation loop
  function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
  }
  
  animate();
  
  // Handle window resize
  window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  });
  
  return {
    // Return methods to control lip sync
    setMouthShape: (shape, value) => {
      if (character) {
        // Find the mesh with morph targets
        character.traverse((node) => {
          if (node.morphTargetDictionary && node.morphTargetDictionary[shape] !== undefined) {
            const index = node.morphTargetDictionary[shape];
            node.morphTargetInfluences[index] = value;
          }
        });
      }
    }
  };
}

// Initialize character
const characterController = setupCharacter();

// Simple lip sync based on audio playback
function syncLipsToAudio(audioElement) {
  // Create audio analyzer
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const analyser = audioContext.createAnalyser();
  const source = audioContext.createMediaElementSource(audioElement);
  
  source.connect(analyser);
  analyser.connect(audioContext.destination);
  
  analyser.fftSize = 32;
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  
  // Animation loop for lip sync
  function updateMouth() {
    requestAnimationFrame(updateMouth);
    
    analyser.getByteFrequencyData(dataArray);
    
    // Simple approach: use audio volume to control mouth opening
    const average = dataArray.reduce((a, b) => a + b) / bufferLength;
    const mouthOpenValue = Math.min(1, average / 128);
    
    // Update mouth shape
    characterController.setMouthShape('mouthOpen', mouthOpenValue);
  }
  
  updateMouth();
}

// Connect lip sync to audio playback
document.getElementById('speech-audio').addEventListener('play', function() {
  syncLipsToAudio(this);
});

// Function to clean text for speech synthesis
function cleanTextForSpeech(text) {
  return text
    // Remove action/emote text between asterisks like *smiles* or *pauses thoughtfully*
    .replace(/\*[^*]+\*/g, '')
    // Remove action/emote text between underscores like _sighs_ or _looks away_
    .replace(/_[^_]+_/g, '')
    // Remove parenthetical stage directions like (smiling) or (in a soft voice)
    .replace(/\([^)]*\)/g, '')
    // Remove any remaining lone asterisks
    .replace(/\*/g, '')
    // Remove any remaining lone underscores
    .replace(/_/g, '')
    // Remove hashtags
    .replace(/#/g, '')
    // Remove brackets and their contents if they look like citations [1], [source], etc.
    .replace(/\[\d+\]/g, '')
    .replace(/\[.*?\]/g, '')
    // Remove excessive punctuation
    .replace(/\.{2,}/g, '.')
    .replace(/!{2,}/g, '!')
    .replace(/\?{2,}/g, '?')
    // Remove quotes that might cause issues
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    // Remove any remaining special characters that shouldn't be spoken
    .replace(/[<>{}|\\^~`]/g, '')
    // Clean up extra whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

// ElevenLabs configuration
const elevenLabsConfig = {
  apiKey: 'YOUR_ELEVENLABS_API_KEY_HERE',
  voiceId: 'zXavd5uyFdq2kwZzInIc', // Default voice, will be overridden
  workerUrl: 'https://historical-figure-voice.ultisim.workers.dev/',
  voiceDesignWorkerUrl: 'https://historical-figure-voice.ultisim.workers.dev/design',
  // Use turbo model for faster generation
  modelId: 'eleven_turbo_v2_5',
  // Maximum latency optimization
  optimizeStreamingLatency: 4
};

// ============================================
// VOICE MATCHING SYSTEM FOR HISTORICAL FIGURES
// ============================================

// Database of historical figure voice characteristics
const historicalFigureVoiceProfiles = {
  // Ancient Greek/Roman philosophers - older, wise, Mediterranean
  'socrates': { gender: 'male', age: 'old', accent: 'mediterranean', tone: 'wise', description: 'An elderly Greek philosopher with a thoughtful, questioning tone. Deep, weathered voice with warmth and wisdom.' },
  'plato': { gender: 'male', age: 'middle_aged', accent: 'mediterranean', tone: 'eloquent', description: 'A middle-aged Greek philosopher with a refined, eloquent speaking style. Clear and authoritative.' },
  'aristotle': { gender: 'male', age: 'middle_aged', accent: 'mediterranean', tone: 'scholarly', description: 'A scholarly Greek philosopher and teacher. Methodical, clear, with intellectual authority.' },
  'pythagoras': { gender: 'male', age: 'old', accent: 'mediterranean', tone: 'mystical', description: 'An ancient Greek mathematician and mystic. Gentle but profound, with a sense of wonder.' },
  'julius caesar': { gender: 'male', age: 'middle_aged', accent: 'italian', tone: 'commanding', description: 'A Roman general and statesman. Commanding, confident, with military authority.' },
  'marcus aurelius': { gender: 'male', age: 'middle_aged', accent: 'italian', tone: 'contemplative', description: 'A Roman emperor and Stoic philosopher. Calm, measured, deeply thoughtful.' },

  // Ancient Egyptian/Ptolemaic
  'cleopatra': { gender: 'female', age: 'young', accent: 'greek', tone: 'regal', description: 'A Greek-Egyptian queen of the Ptolemaic dynasty. Speak with a Mediterranean Greek accent - intelligent, charismatic, and politically astute. Voice should sound like an educated Greek noblewoman with authority and allure.' },
  'nefertiti': { gender: 'female', age: 'young', accent: 'middle_eastern', tone: 'regal', description: 'An Egyptian queen of great beauty and power. Elegant, commanding, mysterious.' },

  // Ancient conquerors
  'alexander': { gender: 'male', age: 'young', accent: 'mediterranean', tone: 'heroic', description: 'A young Macedonian conqueror. Passionate, ambitious, charismatic with youthful energy.' },
  'genghis khan': { gender: 'male', age: 'middle_aged', accent: 'asian', tone: 'fierce', description: 'A Mongol emperor and warrior. Fierce, strategic, commanding respect.' },

  // Renaissance
  'leonardo': { gender: 'male', age: 'middle_aged', accent: 'italian', tone: 'curious', description: 'An Italian Renaissance polymath. Curious, gentle, with wonder and creativity.' },
  'michelangelo': { gender: 'male', age: 'middle_aged', accent: 'italian', tone: 'passionate', description: 'An Italian Renaissance artist. Passionate, intense, perfectionist.' },
  'galileo': { gender: 'male', age: 'old', accent: 'italian', tone: 'defiant', description: 'An Italian astronomer and scientist. Intellectual, determined, slightly defiant.' },

  // British historical figures
  'shakespeare': { gender: 'male', age: 'middle_aged', accent: 'british', tone: 'theatrical', description: 'An English playwright. Theatrical, witty, with rich vocabulary and dramatic flair.' },
  'elizabeth i': { gender: 'female', age: 'middle_aged', accent: 'british', tone: 'regal', description: 'An English queen. Regal, intelligent, commanding, with royal authority.' },
  'queen victoria': { gender: 'female', age: 'old', accent: 'british', tone: 'stern', description: 'A British empress. Dignified, stern, proper Victorian manner.' },
  'winston churchill': { gender: 'male', age: 'old', accent: 'british', tone: 'resolute', description: 'A British prime minister. Gruff, determined, inspiring with gravelly voice.' },
  'isaac newton': { gender: 'male', age: 'middle_aged', accent: 'british', tone: 'intellectual', description: 'An English scientist and mathematician. Precise, intellectual, somewhat reserved.' },
  'charles darwin': { gender: 'male', age: 'old', accent: 'british', tone: 'thoughtful', description: 'An English naturalist. Gentle, observant, carefully spoken with scientific precision.' },

  // French historical figures
  'napoleon': { gender: 'male', age: 'middle_aged', accent: 'french', tone: 'ambitious', description: 'A French emperor and military leader. Ambitious, strategic, commanding with intensity.' },
  'marie antoinette': { gender: 'female', age: 'young', accent: 'french', tone: 'refined', description: 'A French queen. Refined, aristocratic, youthful with elegance.' },
  'joan of arc': { gender: 'female', age: 'young', accent: 'french', tone: 'passionate', description: 'A French military leader and saint. Young, passionate, devout with conviction.' },
  'voltaire': { gender: 'male', age: 'old', accent: 'french', tone: 'witty', description: 'A French philosopher and writer. Witty, sharp, satirical with intelligence.' },

  // American historical figures
  'george washington': { gender: 'male', age: 'middle_aged', accent: 'american', tone: 'dignified', description: 'An American founding father and president. Dignified, reserved, commanding respect.' },
  'abraham lincoln': { gender: 'male', age: 'middle_aged', accent: 'american', tone: 'humble', description: 'An American president. Humble, folksy, with deep moral conviction and occasional humor.' },
  'benjamin franklin': { gender: 'male', age: 'old', accent: 'american', tone: 'jovial', description: 'An American founding father and inventor. Jovial, clever, charming with wit.' },
  'thomas jefferson': { gender: 'male', age: 'middle_aged', accent: 'american', tone: 'eloquent', description: 'An American founding father. Eloquent, philosophical, with refined speech.' },
  'martin luther king': { gender: 'male', age: 'middle_aged', accent: 'american', tone: 'inspiring', description: 'An American civil rights leader. Inspiring, passionate, with powerful oratory.' },
  'harriet tubman': { gender: 'female', age: 'middle_aged', accent: 'american', tone: 'determined', description: 'An American abolitionist. Determined, courageous, with quiet strength.' },

  // Scientists and inventors
  'albert einstein': { gender: 'male', age: 'old', accent: 'german', tone: 'playful', description: 'A German physicist. Playful, curious, with gentle humor and wonder.' },
  'marie curie': { gender: 'female', age: 'middle_aged', accent: 'polish', tone: 'determined', description: 'A Polish-French scientist. Determined, precise, with quiet intensity.' },
  'nikola tesla': { gender: 'male', age: 'middle_aged', accent: 'eastern_european', tone: 'visionary', description: 'A Serbian-American inventor. Visionary, intense, with eccentric brilliance.' },
  'thomas edison': { gender: 'male', age: 'old', accent: 'american', tone: 'practical', description: 'An American inventor. Practical, determined, business-minded.' },

  // Asian historical figures
  'confucius': { gender: 'male', age: 'old', accent: 'asian', tone: 'wise', description: 'A Chinese philosopher. Wise, gentle, with profound simplicity and patience.' },
  'sun tzu': { gender: 'male', age: 'middle_aged', accent: 'asian', tone: 'strategic', description: 'A Chinese military strategist. Strategic, calm, with measured authority.' },
  'buddha': { gender: 'male', age: 'middle_aged', accent: 'indian', tone: 'serene', description: 'An Indian spiritual teacher. Serene, compassionate, with profound peace.' },
  'gandhi': { gender: 'male', age: 'old', accent: 'indian', tone: 'gentle', description: 'An Indian independence leader. Gentle, humble, with quiet moral strength.' },

  // Religious/spiritual figures
  'moses': { gender: 'male', age: 'old', accent: 'middle_eastern', tone: 'prophetic', description: 'A Hebrew prophet. Prophetic, authoritative, with gravitas and humility.' },
  'jesus': { gender: 'male', age: 'young', accent: 'middle_eastern', tone: 'compassionate', description: 'A spiritual teacher. Compassionate, gentle, with profound love and wisdom.' },
  'muhammad': { gender: 'male', age: 'middle_aged', accent: 'middle_eastern', tone: 'wise', description: 'A prophet and leader. Wise, compassionate, with spiritual authority.' }
};

// ElevenLabs pre-made voice IDs mapped to characteristics
// These are real ElevenLabs voice IDs from their library
const elevenLabsVoiceLibrary = {
  // Male voices
  male_old_wise: 'onwK4e9ZLuTAKqWW03F9', // Daniel - deep, wise British
  male_old_american: 'TxGEqnHWrfWFTfGW9XjX', // Josh - warm American
  male_middle_british: 'pNInz6obpgDQGcFmaJgB', // Adam - middle-aged British
  male_middle_american: 'ErXwobaYiN019PkySvjV', // Antoni - clear American
  male_young_heroic: 'VR6AewLTigWG4xSOukaG', // Arnold - strong, heroic
  male_scholarly: 'yoZ06aMxZJJ28mfd3POQ', // Sam - calm, scholarly
  male_commanding: 'pqHfZKP75CvOlQylNhV4', // Bill - authoritative
  male_mediterranean: 'g5CIjZEefAph4nQFvHAz', // Mateo - Mediterranean/European male

  // Female voices
  female_young_regal: 'EXAVITQu4vr4xnSDxMaL', // Bella - elegant, young
  female_middle_british: '21m00Tcm4TlvDq8ikWAM', // Rachel - refined British
  female_middle_american: 'AZnzlk1XvdvUeBnXmlld', // Domi - clear American
  female_determined: 'MF3mGyEYCl7XYWbV9V6O', // Elli - strong, determined
  female_warm: 'jBpfuIE2acCO8z3wKNLl', // Gigi - warm, friendly
  female_greek_regal: 'XB0fDUnXU5powFXDhCwa', // Charlotte - Swedish/European accent, seductive & regal (perfect for Cleopatra)
  female_mediterranean: 'XB0fDUnXU5powFXDhCwa', // Charlotte - European accent for Mediterranean queens

  // Character voices
  narrator_deep: 'N2lVS1w4EtoT3dr4eOWO', // Callum - deep narrator
  storyteller: 'ThT5KcBeYPX3keUQqHPh', // Dorothy - storyteller
};

// Function to determine voice characteristics from figure name
function getVoiceProfileForFigure(figureName) {
  const nameLower = figureName.toLowerCase();

  // Check for exact or partial matches in our database
  for (const [key, profile] of Object.entries(historicalFigureVoiceProfiles)) {
    if (nameLower.includes(key) || key.includes(nameLower)) {
      return { ...profile, matched: true };
    }
  }

  // If no match, try to infer from name patterns
  // This is a basic heuristic - could be improved with Claude API
  return inferVoiceProfile(figureName);
}

// Infer voice profile from name when no match found
function inferVoiceProfile(figureName) {
  const nameLower = figureName.toLowerCase();

  // Common female name patterns/titles
  const femaleIndicators = ['queen', 'empress', 'princess', 'lady', 'madam', 'mrs', 'miss', 'maria', 'mary', 'elizabeth', 'catherine', 'anne', 'victoria', 'joan', 'jane', 'margaret', 'helen', 'sophia', 'rosa', 'florence', 'harriet', 'marie', 'eva', 'frida'];

  // Check for female indicators
  const isFemale = femaleIndicators.some(indicator => nameLower.includes(indicator));

  return {
    gender: isFemale ? 'female' : 'male',
    age: 'middle_aged',
    accent: 'neutral',
    tone: 'authoritative',
    description: `A historical figure named ${figureName}. Speak with authority and wisdom befitting their historical importance.`,
    matched: false
  };
}

// Select the best matching ElevenLabs voice ID based on profile
function selectVoiceId(profile) {
  const { gender, age, tone, accent } = profile;

  if (gender === 'female') {
    // Check for Greek/Mediterranean accent first (for Cleopatra, etc.)
    if (accent === 'greek' || accent === 'mediterranean') {
      if (tone === 'regal' || tone === 'refined' || tone === 'elegant') {
        return elevenLabsVoiceLibrary.female_greek_regal;
      }
      return elevenLabsVoiceLibrary.female_mediterranean;
    }
    // Other female voices
    if (tone === 'regal' || tone === 'refined' || tone === 'elegant') {
      return elevenLabsVoiceLibrary.female_young_regal;
    } else if (tone === 'determined' || tone === 'passionate' || tone === 'fierce') {
      return elevenLabsVoiceLibrary.female_determined;
    } else if (age === 'old' || tone === 'stern') {
      return elevenLabsVoiceLibrary.female_middle_british;
    } else {
      return elevenLabsVoiceLibrary.female_warm;
    }
  } else {
    // Male voices
    // Check for Mediterranean/Greek accent first
    if (accent === 'greek' || accent === 'mediterranean' || accent === 'italian') {
      if (age === 'old' && (tone === 'wise' || tone === 'mystical')) {
        return elevenLabsVoiceLibrary.male_old_wise; // Still sounds good for old Greek philosophers
      }
      return elevenLabsVoiceLibrary.male_mediterranean;
    }
    if (age === 'old' && (tone === 'wise' || tone === 'contemplative' || tone === 'gentle')) {
      return elevenLabsVoiceLibrary.male_old_wise;
    } else if (tone === 'commanding' || tone === 'fierce' || tone === 'ambitious') {
      return elevenLabsVoiceLibrary.male_commanding;
    } else if (tone === 'heroic' || age === 'young') {
      return elevenLabsVoiceLibrary.male_young_heroic;
    } else if (tone === 'scholarly' || tone === 'intellectual' || tone === 'curious') {
      return elevenLabsVoiceLibrary.male_scholarly;
    } else if (tone === 'eloquent' || tone === 'theatrical') {
      return elevenLabsVoiceLibrary.male_middle_british;
    } else {
      return elevenLabsVoiceLibrary.male_middle_american;
    }
  }
}

// Generate voice description for ElevenLabs Voice Design API
function generateVoiceDescription(figureName, profile) {
  const { gender, age, accent, tone, description } = profile;

  // Build a detailed prompt for voice design
  let voicePrompt = description || '';

  if (!voicePrompt) {
    const ageDesc = age === 'old' ? 'elderly' : age === 'young' ? 'youthful' : 'mature';
    const genderDesc = gender === 'female' ? 'woman' : 'man';

    voicePrompt = `A ${ageDesc} ${genderDesc} with a ${tone} speaking style. `;
    voicePrompt += `This is the voice of ${figureName}, a historical figure. `;
    voicePrompt += `The voice should sound natural, human, and appropriate for someone of their era and stature.`;
  }

  return voicePrompt;
}

// Main function to get the appropriate voice for a character
async function getVoiceForCharacter(figureName) {
  console.log('Getting voice for character:', figureName);

  // Get the voice profile
  const profile = getVoiceProfileForFigure(figureName);
  console.log('Voice profile:', profile);

  // Select the best matching pre-made voice
  const voiceId = selectVoiceId(profile);
  console.log('Selected voice ID:', voiceId);

  // Update the config with the selected voice
  elevenLabsConfig.voiceId = voiceId;
  elevenLabsConfig.currentProfile = profile;

  // Store for later use
  state.voiceProfile = profile;
  state.voiceId = voiceId;

  return {
    voiceId,
    profile,
    description: generateVoiceDescription(figureName, profile)
  };
}

// Track if currently speaking
let isSpeaking = false;

// Auto-speak setting - enabled by default
let autoSpeakEnabled = true;

// Function to toggle auto-speak
function toggleAutoSpeak() {
  autoSpeakEnabled = !autoSpeakEnabled;
  const autoSpeakToggle = document.getElementById('auto-speak-toggle');
  if (autoSpeakToggle) {
    autoSpeakToggle.checked = autoSpeakEnabled;
  }
  console.log('Auto-speak:', autoSpeakEnabled ? 'ON' : 'OFF');
  localStorage.setItem('autoSpeakEnabled', autoSpeakEnabled ? 'true' : 'false');
}

// Initialize auto-speak from localStorage
function initAutoSpeak() {
  const saved = localStorage.getItem('autoSpeakEnabled');
  // Default to true (enabled) if not set
  autoSpeakEnabled = saved === null ? true : saved === 'true';
  const autoSpeakToggle = document.getElementById('auto-speak-toggle');
  if (autoSpeakToggle) {
    autoSpeakToggle.checked = autoSpeakEnabled;
    autoSpeakToggle.addEventListener('change', () => {
      autoSpeakEnabled = autoSpeakToggle.checked;
      localStorage.setItem('autoSpeakEnabled', autoSpeakEnabled ? 'true' : 'false');
      console.log('Auto-speak:', autoSpeakEnabled ? 'ON' : 'OFF');
    });
  }
}

// Update button state with colors
function updateSpeakButtonState(state) {
  const speakBtn = document.getElementById('speak-btn');
  if (!speakBtn) return;

  // Remove all state classes
  speakBtn.classList.remove('loading', 'ready', 'playing');

  switch(state) {
    case 'loading':
      speakBtn.classList.add('loading');
      break;
    case 'ready':
      speakBtn.classList.add('ready');
      break;
    case 'playing':
      speakBtn.classList.add('playing');
      break;
    default:
      // Default state
      break;
  }
}

// Function to generate speech using ElevenLabs
async function generateSpeech(text) {
  const audioElement = document.getElementById('speech-audio');

  // If already speaking, stop it
  if (isSpeaking && audioElement) {
    audioElement.pause();
    audioElement.currentTime = 0;
    isSpeaking = false;
    updateSpeakButtonState('default');
    return;
  }

  // Clean the text
  const cleanedText = cleanTextForSpeech(text);
  console.log("Speaking:", cleanedText.substring(0, 100) + "...");

  if (!cleanedText || cleanedText.length < 2) {
    console.warn("Text too short for speech synthesis");
    return;
  }

  // Show loading state (red)
  updateSpeakButtonState('loading');
  isSpeaking = true;

  try {
    // Use the character-specific voice ID if available, otherwise use default
    const voiceIdToUse = state.voiceId || elevenLabsConfig.voiceId;
    console.log('Using voice ID:', voiceIdToUse);

    // Call ElevenLabs via worker with optimized settings
    const response = await fetch(elevenLabsConfig.workerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        apiKey: elevenLabsConfig.apiKey,
        voiceId: voiceIdToUse,
        text: cleanedText,
        modelId: elevenLabsConfig.modelId,
        optimizeStreamingLatency: elevenLabsConfig.optimizeStreamingLatency
      })
    });

    if (!response.ok) {
      throw new Error('Speech generation failed');
    }

    // Get audio blob and play
    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);

    audioElement.src = audioUrl;

    // Show ready state (green) just before playing
    updateSpeakButtonState('ready');

    audioElement.onended = () => {
      isSpeaking = false;
      updateSpeakButtonState('default');
      URL.revokeObjectURL(audioUrl);
    };

    audioElement.onerror = () => {
      isSpeaking = false;
      updateSpeakButtonState('default');
      console.error('Audio playback error');
    };

    // Show playing state while audio plays
    audioElement.onplay = () => {
      updateSpeakButtonState('playing');
    };

    await audioElement.play();

  } catch (error) {
    console.error('Error generating speech:', error);
    isSpeaking = false;
    updateSpeakButtonState('default');
    alert('Failed to generate speech. Please try again.');
  }
}

// Helper to speak the last bot message
function speakLastBotMessage() {
  const botMessages = document.querySelectorAll('.message.bot .message-bubble p');
  if (botMessages.length > 0) {
    const lastBotMessage = botMessages[botMessages.length - 1];
    if (lastBotMessage && lastBotMessage.textContent) {
      generateSpeech(lastBotMessage.textContent);
    }
  } else {
    console.log("No bot messages found to speak");
  }
}
async function createChatbot() {
  console.log("Creating chatbot");
  state.name = figureNameInput.value.trim();

  if (!state.name) {
    alert('Please enter a name for your historical figure.');
    return;
  }

  if (!state.image) {
    alert('Please upload an image for your historical figure.');
    return;
  }

  if (state.documents.length === 0) {
    alert('Please upload at least one document.');
    return;
  }

  // Show loading state on button
  const createBtn = document.getElementById('create-btn');
  const originalBtnText = createBtn.textContent;
  createBtn.textContent = 'Setting up voice...';
  createBtn.disabled = true;

  try {
    // Get the appropriate voice for this character
    const voiceInfo = await getVoiceForCharacter(state.name);
    console.log('Voice configured:', voiceInfo);
  } catch (error) {
    console.error('Error setting up voice:', error);
    // Continue with default voice if voice selection fails
  }

  createBtn.textContent = originalBtnText;
  createBtn.disabled = false;

  // Process documents for chunking
  processDocuments();
  
  // Set up chat screen
  figureDisplayName.textContent = state.name;
  figureDisplayImg.src = state.image;
  messageInput.placeholder = `Ask ${state.name} a question...`;
  
  // Populate sources list
  sourcesList.innerHTML = '';
  state.documents.forEach(doc => {
    const li = document.createElement('li');
    li.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
      ${doc.name}
    `;
    sourcesList.appendChild(li);
  });

  // Update voice info display
  const voiceDescription = document.getElementById('voice-description');
  if (voiceDescription && state.voiceProfile) {
    const profile = state.voiceProfile;
    const tags = [];
    if (profile.gender) tags.push(profile.gender === 'female' ? '♀ Female' : '♂ Male');
    if (profile.age) tags.push(profile.age.replace('_', ' '));
    if (profile.tone) tags.push(profile.tone);
    if (profile.accent && profile.accent !== 'neutral') tags.push(profile.accent);

    voiceDescription.innerHTML = `
      <div style="margin-bottom: 0.5rem;">
        ${tags.map(tag => `<span class="voice-tag">${tag}</span>`).join('')}
      </div>
      <span>${profile.description || 'Voice matched to character'}</span>
    `;
  } else if (voiceDescription) {
    voiceDescription.textContent = 'Default voice selected';
  }

  // Add welcome message
  addMessage('bot', `Hello! I am ${state.name}. Feel free to ask me anything based on the documents you've provided.`);
  
  // Show chat screen
  configScreen.classList.add('hidden');
  chatScreen.classList.remove('hidden');
}

function resetChatbot() {
  // Reset state
  state = {
    name: '',
    image: null,
    documents: [],
    conversation: [],
    chunks: []
  };
  
  // Reset UI
  figureNameInput.value = '';
  previewImg.src = '';
  imagePreview.classList.add('hidden');
  document.querySelector('.upload-placeholder').classList.remove('hidden');
  documentList.classList.add('hidden');
  docCount.textContent = '0';
  documentsContainer.innerHTML = '';
  messagesContainer.innerHTML = '';
  
  // Show config screen
  chatScreen.classList.add('hidden');
  configScreen.classList.remove('hidden');
}

function addMessage(role, content) {
  const message = document.createElement('div');
  message.className = `message ${role}`;

  const messageBubble = document.createElement('div');
  messageBubble.className = 'message-bubble';

  const messageHeader = document.createElement('div');
  messageHeader.className = 'message-header';

  // Add icon and name
  if (role === 'user') {
    messageHeader.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
      <span>You</span>
    `;
  } else {
    messageHeader.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
      <span>${state.name}</span>
    `;
  }

  const messageContent = document.createElement('p');
  messageContent.textContent = content;

  messageBubble.appendChild(messageHeader);
  messageBubble.appendChild(messageContent);
  message.appendChild(messageBubble);
  messagesContainer.appendChild(message);

  // Scroll to bottom
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  // Auto-speak bot messages if enabled
  if (role === 'bot' && autoSpeakEnabled && content) {
    console.log('Auto-speaking bot response...');
    // Small delay to let the UI update first
    setTimeout(() => {
      generateSpeech(content);
    }, 100);
  }
}

async function sendMessage() {
  const message = messageInput.value.trim();
  if (!message) return;
  
  // Add user message
  addMessage('user', message);
  messageInput.value = '';
  
  // Show loading indicator
  const loadingMessage = document.createElement('div');
  loadingMessage.className = 'message bot';
  loadingMessage.innerHTML = `
    <div class="message-bubble">
      <div class="message-header">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
        <span>${state.name}</span>
      </div>
      <p>Thinking...</p>
    </div>
  `;
  messagesContainer.appendChild(loadingMessage);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
  
  // Check if we should use API mode or demo mode
  const apiToggle = document.getElementById('api-toggle');
  const useAPIMode = apiToggle ? apiToggle.checked : (localStorage.getItem('useAPIMode') === 'true');
  console.log("Current mode:", useAPIMode ? "Claude API" : "Demo");

  if (!useAPIMode) {
    try {
      // Prepare document context
      const documentContext = state.documents.map(doc => {
        return `Document: ${doc.name}\nContent: ${doc.content}\n\n`;
      }).join('');
      
      // Generate enhanced demo response
      const demoResponse = await generateDemoResponse(documentContext, message);
      
      // Remove loading message
      messagesContainer.removeChild(loadingMessage);
      
      // Add bot response to UI
      addMessage('bot', demoResponse);
    } catch (error) {
      console.error('Error:', error);
      messagesContainer.removeChild(loadingMessage);
      addMessage('bot', `I'm sorry, I encountered an error while processing your request.`);
    }
    
    return;
  }
  
  // If we're here, we're using API mode
  try {
    console.log("Using Claude API via Cloudflare Worker");
    // Prepare document context
    const documentContext = state.documents.map(doc => {
      return `Document: ${doc.name}\nContent: ${doc.content}\n\n`;
    }).join('');
    console.log(`Prepared document context (${documentContext.length} chars)`);
    
    // Get relevant chunks
    const relevantChunks = findRelevantChunks(message);
    console.log(`Found ${relevantChunks.length} relevant chunks`);
    
    // Create context from relevant chunks AND full document context
    // We always include full document context so Claude has complete knowledge
    let contextToUse = documentContext;

    // If we found relevant chunks, highlight them at the top
    if (relevantChunks.length > 0) {
      const highlightedChunks = relevantChunks.map(chunk =>
        `[HIGHLY RELEVANT - From ${chunk.docName}]:\n${chunk.content}`
      ).join('\n\n');
      contextToUse = `MOST RELEVANT PASSAGES FOR THIS QUESTION:\n${highlightedChunks}\n\n---\n\nFULL DOCUMENT CONTEXT:\n${documentContext}`;
      console.log(`Found ${relevantChunks.length} relevant chunks, plus full context (${contextToUse.length} chars)`);
    } else {
      console.log("No specific relevant chunks found, using full document context (${documentContext.length} chars)");
    }
    
    // Store the message in conversation history
    if (!state.conversation) {
      state.conversation = [];
    }
    
    state.conversation.push({
      role: 'user',
      content: message
    });
    console.log("Added message to conversation history");
    
    // Call Claude API via Cloudflare Worker
    console.log("Calling Claude API...");
    const response = await callClaudeAPI(contextToUse, message);
    console.log("Received response from Claude API");
    
    // Remove loading message
    messagesContainer.removeChild(loadingMessage);
    
    // Add response to conversation history
    state.conversation.push({
      role: 'assistant', 
      content: response
    });
    console.log("Added response to conversation history");
    
    // Add bot response to UI
    addMessage('bot', response);
    
  } catch (error) {
    console.error('Error during sendMessage:', error);
    messagesContainer.removeChild(loadingMessage);
    addMessage('bot', `I'm sorry, I encountered an error while processing your request: ${error.message}`);
  }
}

// Function to call Claude API via Cloudflare Worker
async function callClaudeAPI(context, userMessage) {
  const API_KEY = config.apiKey;
  
  try {
    console.log("Starting Claude API call via Cloudflare Worker");
    
    // Format messages for Claude API (we'll move system to the top level)
    let messages = [];
    
    // System message content goes into a separate parameter
    const systemContent = `You are ${state.name}, a historical figure brought back to life to share your wisdom. You should respond in first person, as if you ARE this historical figure speaking directly to the questioner.

IMPORTANT INSTRUCTIONS:
1. You have access to specific documents about yourself below. Use these as your PRIMARY source of information.
2. HOWEVER, you should ALSO draw upon your general historical knowledge about ${state.name} to provide rich, comprehensive answers.
3. If the documents don't contain information about a topic, use your broader knowledge of ${state.name}'s life, teachings, accomplishments, and historical context to answer.
4. Speak with the personality, wisdom, and perspective that ${state.name} would have had.
5. For questions like "What is your greatest accomplishment?" - draw on both the documents AND general historical knowledge to give a thoughtful, in-character response.
6. ABSOLUTELY CRITICAL - NO STAGE DIRECTIONS: Your response will be spoken aloud by a text-to-speech system. You MUST NOT include:
   - NO asterisks with actions like *smiles* or *pauses thoughtfully* or *leans forward*
   - NO parenthetical directions like (softly) or (with a laugh)
   - NO narrative descriptions of your actions or expressions
   - NO meta-commentary about how you're speaking
   Just write pure dialogue - the actual words you would speak, nothing else.

DOCUMENTS ABOUT YOU:
${context}

Remember: You ARE ${state.name}. Speak as yourself, sharing your wisdom, experiences, and teachings. Be engaging and educational. Write ONLY the words you would actually say - no stage directions, no asterisks, no action descriptions.`;
    
    // Add conversation history
    if (state.conversation && state.conversation.length > 0) {
      // Include previous messages, but not the current one
      for (let i = 0; i < state.conversation.length - 1; i++) {
        const msg = state.conversation[i];
        messages.push({
          role: msg.role,
          content: msg.content
        });
      }
    }
    
    // Add current user message
    messages.push({
      role: "user",
      content: userMessage
    });
    
    // Replace with your Cloudflare Worker URL
    const workerUrl = 'https://historical-figure2-app.ultisim.workers.dev/';
    console.log("Using worker URL:", workerUrl);
    
    // Prepare the request data with system as top-level parameter
    const requestData = {
      apiKey: API_KEY,
      model: 'claude-3-haiku-20240307',
      max_tokens: 1000,
      messages: messages,
      system: systemContent,  // System content as top-level parameter
      temperature: 0.7
    };
    
    console.log("Sending request to worker...");
    console.log("Request payload structure:", Object.keys(requestData));
    console.log("Number of messages:", requestData.messages.length);
    
    // Call your Worker instead of Claude API directly
    const response = await fetch(workerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });
    
    console.log("Worker response status:", response.status);
    
    // Check for HTTP errors
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Worker error response:", errorText);
      throw new Error(`Worker returned error ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    console.log("Worker response data structure:", Object.keys(data));
    
    if (data.error) {
      console.error("API error:", data.error);
      throw new Error(data.error.message || 'Error from Claude API');
    }
    
    // Check Claude's response format
    if (!data.content || !Array.isArray(data.content)) {
      console.error("Unexpected response format:", data);
      return "I received an unexpected response format. Please try again.";
    }
    
    return data.content && data.content[0] && data.content[0].text 
      ? data.content[0].text 
      : "I'm sorry, I couldn't generate a response.";
    
  } catch (error) {
    console.error('Claude API Error:', error);
    throw error;
  }
}
// Enhanced demo mode that simulates Claude's responses with improved relevance
async function generateDemoResponse(context, question) {
  console.log("Using enhanced demo mode");
  
  const questionLowerCase = question.toLowerCase();
  
  // Extract keywords from the question
  const keywords = questionLowerCase
    .replace(/[?.,!"]/g, '')
    .split(' ')
    .filter(word => word.length > 2);
  
  console.log("Keywords from question:", keywords);
  
  // Find the most relevant document parts using a scoring system
  let documentScores = [];
  
  state.documents.forEach((doc, docIndex) => {
    const content = doc.content.toLowerCase();
    let score = 0;
    let bestSnippet = "";
    let bestSnippetScore = 0;
    
    // Score each paragraph
    const paragraphs = content.split(/\n\n+/);
    
    paragraphs.forEach(paragraph => {
      if (paragraph.length < 20) return; // Skip very short paragraphs
      
      let paragraphScore = 0;
      
      // Check for exact phrase matches (highest value)
      if (paragraph.includes(questionLowerCase.replace(/[?.,!"]/g, ''))) {
        paragraphScore += 100;
      }
      
      // Score based on keyword density
      keywords.forEach(keyword => {
        // Skip very common words or short words
        if (['the', 'and', 'or', 'of', 'to', 'in', 'is', 'was', 'a', 'an'].includes(keyword)) return;
        
        const keywordRegex = new RegExp(keyword, 'gi');
        const matches = paragraph.match(keywordRegex);
        
        if (matches) {
          // More important to have multiple different keywords than repeats of the same one
          paragraphScore += 10 + matches.length;
        }
      });
      
      // If this paragraph is the best so far, save it
      if (paragraphScore > bestSnippetScore) {
        bestSnippetScore = paragraphScore;
        bestSnippet = paragraph;
      }
      
      score += paragraphScore;
    });
    
    documentScores.push({
      docName: doc.name,
      score: score,
      snippet: bestSnippet
    });
  });
  
  // Sort documents by score
  documentScores.sort((a, b) => b.score - a.score);
  console.log("Document scores:", documentScores);
  
  // Generate a response
  let response = "";
  
  if (documentScores.length > 0 && documentScores[0].score > 10) {
    // We found something relevant
    const topDocs = documentScores.filter(doc => doc.score > 10).slice(0, 2);
    
    // Start with a confident introduction
    response = `As ${state.name}, I can tell you about ${questionLowerCase.replace(/[?.,!"]/g, '')}. `;
    
    // Add information from the top-scoring documents
    topDocs.forEach(doc => {
      response += doc.snippet + " ";
    });
    
    // Make response more conversational and in first person
    response = response
      .replace(/\s+/g, ' ') // Remove multiple spaces
      .replace(new RegExp(state.name, 'gi'), "I") // Replace mentions of the character name with "I"
      .replace(/is believed to have/g, "am believed to have")
      .replace(/was born/g, "was born")
      .replace(/he /g, "I ")
      .replace(/his /g, "my ")
      .replace(/\bhim\b/g, "me")
      .replace(/\. /g, '. ') // Add spacing after periods
      .trim();
    
    // Add a closing statement
    const questionTopic = keywords.filter(word => word.length > 3).slice(0, 2).join(' ');
    response += ` I hope this provides insight into ${questionTopic || 'your question'}.`;
  } else {
    // No relevant information found
    response = `As ${state.name}, I don't have specific information about "${question}" in the documents you've provided. The documents you uploaded may not contain details about this topic. Could you try asking about something else mentioned in the documents?`;
  }
  
  // Simulate a delay for realism
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  return response;
}

// ============================================
// KNOWLEDGE BANK SEARCH FUNCTIONALITY
// ============================================

// Function to search for knowledge banks about a historical figure
async function searchKnowledgeBanks() {
  const figureName = figureNameInput.value.trim();

  if (!figureName) {
    alert('Please enter a historical figure name first.');
    return;
  }

  const searchBtn = document.getElementById('search-knowledge-btn');
  const container = document.getElementById('knowledge-banks-container');
  const list = document.getElementById('knowledge-banks-list');
  const loadingText = document.getElementById('kb-loading');

  // Show loading state
  searchBtn.disabled = true;
  searchBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>
    Searching...
  `;
  container.classList.remove('hidden');
  loadingText.classList.remove('hidden');
  list.innerHTML = '';

  try {
    // First, check if we have pre-built knowledge banks for this figure
    // This is faster and more reliable than the API
    console.log('Searching knowledge banks for:', figureName);
    const fallbackBanks = generateFallbackKnowledgeBanks(figureName);
    console.log('Generated fallback banks:', fallbackBanks.figureName);

    // Check if we got specific content (not just generic placeholders)
    const hasSpecificContent = fallbackBanks.banks &&
      fallbackBanks.banks[0] &&
      fallbackBanks.banks[0].content &&
      !fallbackBanks.banks[0].content.includes('encompasses their birth, family background');

    console.log('Has specific content:', hasSpecificContent);
    console.log('First bank title:', fallbackBanks.banks?.[0]?.title);

    if (hasSpecificContent) {
      // We have pre-built knowledge for this figure - use it immediately
      console.log('✓ Using pre-built knowledge banks for:', figureName);
      loadingText.classList.add('hidden');
      renderKnowledgeBanks(fallbackBanks);
    } else {
      // Try the API for figures not in our database
      console.log('Attempting API call for:', figureName);
      try {
        const knowledgeBanks = await getKnowledgeBankSuggestions(figureName);
        loadingText.classList.add('hidden');
        renderKnowledgeBanks(knowledgeBanks);
      } catch (apiError) {
        console.log('API failed, using generic knowledge banks');
        loadingText.classList.add('hidden');
        // Use the generic fallback
        renderKnowledgeBanks(fallbackBanks);
      }
    }

  } catch (error) {
    console.error('Error searching knowledge banks:', error);
    loadingText.classList.add('hidden');

    // Final fallback - generate generic banks
    const genericBanks = generateFallbackKnowledgeBanks(figureName);
    renderKnowledgeBanks(genericBanks);
  } finally {
    searchBtn.disabled = false;
    searchBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>
      Search Knowledge Banks
    `;
  }
}

// Function to get knowledge bank suggestions from Claude
async function getKnowledgeBankSuggestions(figureName) {
  // Use the exact same worker URL and pattern as the working callClaudeAPI function
  const workerUrl = 'https://historical-figure2-app.ultisim.workers.dev/';
  const API_KEY = config.apiKey;

  console.log('Fetching knowledge banks for:', figureName);

  const systemPrompt = `You are a knowledgeable historian. When given a historical figure's name, provide exactly 5 knowledge banks with detailed, accurate historical information.

IMPORTANT: Respond with ONLY valid JSON, no other text before or after:
{
  "figureName": "Full name of the figure",
  "banks": [
    {
      "id": "bio",
      "title": "Biography and Early Life",
      "description": "Birth, family, education and formative years",
      "content": "Detailed paragraph of 100-150 words about their life story..."
    },
    {
      "id": "achievements",
      "title": "Major Achievements",
      "description": "Their most significant accomplishments",
      "content": "Detailed paragraph of 100-150 words about their achievements..."
    },
    {
      "id": "beliefs",
      "title": "Philosophy and Beliefs",
      "description": "Their ideas, teachings, and worldview",
      "content": "Detailed paragraph of 100-150 words about their philosophy..."
    },
    {
      "id": "context",
      "title": "Historical Context",
      "description": "The era and world they lived in",
      "content": "Detailed paragraph of 100-150 words about their historical context..."
    },
    {
      "id": "legacy",
      "title": "Legacy and Influence",
      "description": "Their lasting impact on history",
      "content": "Detailed paragraph of 100-150 words about their legacy..."
    }
  ]
}`;

  // Prepare request data - exact same structure as callClaudeAPI
  const requestData = {
    apiKey: API_KEY,
    model: 'claude-3-haiku-20240307',
    max_tokens: 2500,
    messages: [{
      role: 'user',
      content: `Generate 5 detailed knowledge banks for: ${figureName}. Include accurate historical facts, dates, and specific details. Return ONLY the JSON object.`
    }],
    system: systemPrompt,
    temperature: 0.7
  };

  console.log('Sending knowledge bank request to worker...');
  console.log('Request payload keys:', Object.keys(requestData));

  const response = await fetch(workerUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestData)
  });

  console.log('Worker response status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Worker error response:', errorText);
    throw new Error(`API request failed (${response.status})`);
  }

  const data = await response.json();
  console.log('Response received, keys:', Object.keys(data));

  if (data.error) {
    console.error('API returned error:', data.error);
    throw new Error(data.error.message || 'API error');
  }

  // Check Claude's response format - same as callClaudeAPI
  if (!data.content || !Array.isArray(data.content)) {
    console.error('Unexpected response format:', data);
    throw new Error('Invalid response format');
  }

  const responseText = data.content[0]?.text || '';
  console.log('Response text preview:', responseText.substring(0, 300));

  // Try to extract and parse JSON
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.banks && Array.isArray(parsed.banks)) {
        console.log('Successfully parsed', parsed.banks.length, 'knowledge banks');
        return parsed;
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
    }
  }

  throw new Error('Could not parse knowledge banks from response');
}

// Fallback knowledge banks for common historical figures
function generateFallbackKnowledgeBanks(figureName) {
  const nameLower = figureName.toLowerCase();

  // Extensive library of historical figures with pre-built knowledge banks
  const fallbackData = {
    'socrates': {
      figureName: 'Socrates',
      banks: [
        { id: 'bio', title: 'Life in Athens', description: 'His life as an Athenian citizen and philosopher', content: 'Socrates (470-399 BCE) was born in Athens to Sophroniscus, a stonemason, and Phaenarete, a midwife. He served as a hoplite soldier in several military campaigns, showing remarkable courage. Unlike other philosophers, he wrote nothing down, preferring direct conversation. He spent his days in the Athenian agora, engaging citizens in philosophical dialogue. He married Xanthippe and had three sons. Despite his wisdom, he lived in poverty, claiming to be concerned only with the pursuit of truth.' },
        { id: 'method', title: 'The Socratic Method', description: 'His revolutionary approach to philosophical inquiry', content: 'Socrates developed the dialectical method of inquiry known as the Socratic Method (elenchus). Rather than lecturing, he asked probing questions to expose contradictions in his interlocutors\' beliefs. This method aimed to stimulate critical thinking and illuminate ideas. His famous claim "I know that I know nothing" (Socratic irony) was central to his approach - pretending ignorance to draw out others\' assumptions. This method remains foundational to Western education and legal cross-examination.' },
        { id: 'philosophy', title: 'Ethical Philosophy', description: 'His teachings on virtue, knowledge, and the good life', content: 'Socrates believed that knowledge and virtue were inseparable - that people do wrong only out of ignorance. He argued that the unexamined life is not worth living and that caring for one\'s soul was more important than wealth or reputation. He taught that virtue (arete) leads to happiness (eudaimonia). His focus on ethics and human behavior shifted Greek philosophy from cosmological speculation to moral inquiry, earning him the title "father of Western philosophy."' },
        { id: 'trial', title: 'Trial and Death', description: 'His famous trial and execution in Athens', content: 'In 399 BCE, Socrates was tried on charges of impiety (not believing in the gods of Athens) and corrupting the youth. His accusers included Meletus, Anytus, and Lycon. Despite opportunities to escape, he accepted the jury\'s death sentence, arguing that fleeing would contradict his lifelong teachings about justice and virtue. He spent his final hours with friends discussing the immortality of the soul, then calmly drank the poison hemlock. His death became a symbol of philosophical martyrdom.' },
        { id: 'legacy', title: 'Philosophical Legacy', description: 'His enduring influence on Western thought', content: 'Though Socrates wrote nothing, his influence is incalculable. His student Plato immortalized his teachings in dialogues that became foundational Western texts. Through Plato\'s student Aristotle, Socratic philosophy shaped science, logic, and politics. The Socratic Method remains central to legal education and critical thinking. His example of questioning authority and seeking truth has inspired reformers and philosophers for millennia. He stands as the archetype of the philosopher willing to die for his principles.' }
      ]
    },
    'aristotle': {
      figureName: 'Aristotle',
      banks: [
        { id: 'bio', title: 'Life and Education', description: 'From student of Plato to tutor of Alexander', content: 'Aristotle (384-322 BCE) was born in Stagira, Macedonia. His father Nicomachus was physician to King Amyntas III. At 17, Aristotle joined Plato\'s Academy in Athens, studying there for 20 years until Plato\'s death. He later tutored young Alexander (the Great) for several years. In 335 BCE, he founded his own school, the Lyceum, in Athens, where he taught while walking (his followers were called Peripatetics). He fled Athens after Alexander\'s death and died the following year.' },
        { id: 'science', title: 'Scientific Contributions', description: 'His pioneering work in biology, physics, and natural science', content: 'Aristotle was the first true scientist, systematically observing and classifying the natural world. He dissected animals, classified over 500 species, and made accurate observations about marine biology that weren\'t verified until the 19th century. His Physics introduced concepts of causation (material, formal, efficient, final causes) that dominated science for nearly 2000 years. Though some theories were later disproven, his empirical approach and systematic methodology laid the foundation for scientific inquiry.' },
        { id: 'logic', title: 'Logic and Reasoning', description: 'His creation of formal logic and scientific methodology', content: 'Aristotle invented formal logic, developing the syllogism - a form of deductive reasoning that remained the basis of logical thought until the 19th century. His Organon (collection of logical works) established rules for valid argumentation. He distinguished between different types of knowledge and reasoning, creating frameworks for scientific demonstration. His logical works became the standard curriculum in medieval universities and remain influential in philosophy and computer science.' },
        { id: 'ethics', title: 'Ethics and Politics', description: 'His teachings on virtue, happiness, and the ideal state', content: 'In Nicomachean Ethics, Aristotle argued that the highest good is eudaimonia (flourishing/happiness), achieved through virtuous activity. He developed the doctrine of the mean - virtue lies between excess and deficiency. His Politics analyzed different forms of government and argued that humans are naturally political animals. He believed the ideal state enables citizens to live virtuously. These works profoundly influenced political philosophy, from medieval thinkers to the American Founders.' },
        { id: 'legacy', title: 'Lasting Influence', description: 'His impact on philosophy, science, and Western civilization', content: 'Aristotle\'s influence spans virtually every field of knowledge. His works were preserved by Islamic scholars and rediscovered in medieval Europe, where they dominated university education. Thomas Aquinas synthesized Aristotelian philosophy with Christian theology. His logic remained standard until modern times. His biology influenced Darwin. His ethics and politics continue to be studied. He remains one of history\'s most influential thinkers, called simply "The Philosopher" by medieval scholars.' }
      ]
    },
    'alexander': {
      figureName: 'Alexander the Great',
      banks: [
        { id: 'bio', title: 'Youth and Rise', description: 'His early life and ascension to power', content: 'Alexander III of Macedon (356-323 BCE) was born to King Philip II and Olympias of Epirus. Tutored by Aristotle from age 13-16, he received an exceptional education in philosophy, science, and literature. He tamed the wild horse Bucephalus as a youth, impressing his father. At 16, he served as regent while Philip was away. When Philip was assassinated in 336 BCE, Alexander, aged 20, became king. He quickly consolidated power by eliminating rivals and crushing rebellions in Greece.' },
        { id: 'conquests', title: 'Military Campaigns', description: 'His unprecedented conquests across three continents', content: 'Alexander\'s military campaigns were extraordinary in scope and speed. He defeated the Persian Empire at Granicus (334 BCE), Issus (333 BCE), and Gaugamela (331 BCE). He conquered Egypt, founding Alexandria, then pushed east through Persia, Central Asia, and into India. In just 13 years, he created an empire stretching from Greece to northwestern India - the largest the ancient world had seen. He never lost a major battle, winning through tactical brilliance, personal courage, and inspiring leadership.' },
        { id: 'tactics', title: 'Military Genius', description: 'His innovative tactics and leadership style', content: 'Alexander revolutionized ancient warfare. He combined Macedonian phalanx infantry with cavalry in coordinated attacks. His use of the companion cavalry as a shock weapon was revolutionary. He excelled at siege warfare, capturing supposedly impregnable cities like Tyre. He led from the front, suffering numerous wounds, which inspired fierce loyalty. He adapted tactics to different terrains and enemies, from Persian cavalry to Indian war elephants. His campaigns are still studied at military academies worldwide.' },
        { id: 'vision', title: 'Cultural Vision', description: 'His dream of uniting East and West', content: 'Alexander sought not just conquest but cultural fusion. He adopted Persian customs and dress, married Persian princesses (Roxana and Stateira), and encouraged his officers to marry Asian women. He founded over 70 cities, spreading Greek culture while respecting local traditions. He sought to create a unified empire blending Greek and Persian elements. This vision of cultural synthesis, though controversial among his generals, planted seeds for the Hellenistic civilization that followed.' },
        { id: 'legacy', title: 'Legacy and Death', description: 'His mysterious death and lasting impact', content: 'Alexander died in Babylon in 323 BCE, aged 32, after a fever - possibly typhoid, poison, or complications from wounds and drinking. His empire was divided among his generals (the Diadochi), creating Hellenistic kingdoms. The spread of Greek culture he initiated transformed the ancient world, facilitating exchange between East and West. The Library of Alexandria became a center of learning. His legend influenced Julius Caesar, Napoleon, and countless military leaders. He remains the standard against which conquerors are measured.' }
      ]
    },
    'leonardo': {
      figureName: 'Leonardo da Vinci',
      banks: [
        { id: 'bio', title: 'Life and Times', description: 'His journey through Renaissance Italy', content: 'Leonardo di ser Piero da Vinci (1452-1519) was born in Vinci, near Florence, the illegitimate son of a notary. Apprenticed to Andrea del Verrocchio at 14, he quickly surpassed his master. He worked in Florence, Milan (for Ludovico Sforza), Rome, and finally France, where he died in the service of King Francis I. A vegetarian and left-handed writer (using mirror script), he was known for his gentle nature and striking appearance. He never married and left most works unfinished.' },
        { id: 'art', title: 'Artistic Masterpieces', description: 'His revolutionary paintings and artistic techniques', content: 'Leonardo\'s paintings revolutionized art. The Mona Lisa\'s mysterious smile and sfumato technique (subtle gradations of tone) set new standards for portraiture. The Last Supper\'s dramatic composition and psychological depth transformed narrative painting. His unfinished works like the Adoration of the Magi show his innovative methods. He pioneered chiaroscuro (light-dark contrast), atmospheric perspective, and anatomical accuracy. Though he completed few paintings, each was revolutionary, influencing artists for centuries.' },
        { id: 'science', title: 'Scientific Studies', description: 'His investigations into anatomy, nature, and physics', content: 'Leonardo was one of history\'s greatest scientific observers. He dissected over 30 human bodies, creating anatomical drawings of unprecedented accuracy - including the first correct depiction of the spine and fetus. He studied water flow, bird flight, botany, and geology. His notebooks contain observations about fossils, optics, and mechanics that anticipated later discoveries. Though he published nothing, his empirical approach prefigured the scientific method. His anatomical studies weren\'t surpassed for 200 years.' },
        { id: 'inventions', title: 'Inventions and Engineering', description: 'His visionary designs and mechanical innovations', content: 'Leonardo\'s notebooks contain thousands of drawings for inventions centuries ahead of their time: flying machines, helicopters, parachutes, tanks, submarines, and robots. He designed bridges, canals, and urban planning systems. Many designs were impractical with contemporary technology, but showed remarkable understanding of mechanical principles. He worked as a military engineer, designing fortifications and weapons. His systematic approach to engineering problems established principles still used today.' },
        { id: 'legacy', title: 'Universal Genius', description: 'His enduring influence and the Renaissance ideal', content: 'Leonardo embodies the "Renaissance man" - excelling in art, science, engineering, anatomy, and more. His Vitruvian Man symbolizes the union of art and science. His notebooks, with 13,000 pages of notes and drawings, reveal a mind of unparalleled curiosity and creativity. He influenced artists from Michelangelo to modern times. His scientific drawings anticipated discoveries by centuries. He remains the archetype of human creative genius, demonstrating that art and science can illuminate each other.' }
      ]
    },
    'cleopatra': {
      figureName: 'Cleopatra VII',
      banks: [
        {
          id: 'bio-1',
          title: 'Life and Reign',
          description: 'The life story and reign of Egypt\'s last active pharaoh',
          content: 'Cleopatra VII Philopator (69-30 BCE) was the last active ruler of the Ptolemaic Kingdom of Egypt. Born into the Greek Ptolemaic dynasty, she was highly educated, speaking multiple languages including Egyptian - the first Ptolemaic ruler to learn the native language. She became queen at 18 and co-ruled with her father, then her brothers, before eventually ruling alone. Her reign lasted approximately 21 years, during which she worked to restore Egyptian independence and expand her kingdom\'s influence.'
        },
        {
          id: 'pol-2',
          title: 'Political Alliances',
          description: 'Her strategic relationships with Rome\'s most powerful leaders',
          content: 'Cleopatra forged crucial political alliances with two of Rome\'s most powerful men: Julius Caesar and Mark Antony. Her relationship with Caesar (48-44 BCE) resulted in a son, Caesarion, and significant political support. After Caesar\'s assassination, she allied with Mark Antony, bearing him three children. These relationships were both romantic and deeply political, aimed at preserving Egyptian independence against Roman expansion. The alliance with Antony ultimately led to war with Octavian (later Augustus).'
        },
        {
          id: 'int-3',
          title: 'Intelligence and Education',
          description: 'Her renowned intellect and scholarly achievements',
          content: 'Cleopatra was renowned for her intelligence and education. She spoke at least nine languages, including Egyptian, Greek, Hebrew, and Aramaic. She was educated at the Mouseion in Alexandria, one of the ancient world\'s greatest centers of learning. Ancient sources describe her as a brilliant conversationalist, skilled diplomat, and knowledgeable in mathematics, philosophy, and astronomy. Her intellectual abilities, rather than just her beauty, were key to her political success.'
        },
        {
          id: 'econ-4',
          title: 'Economic Reforms',
          description: 'Her efforts to strengthen Egypt\'s economy and trade',
          content: 'As pharaoh, Cleopatra implemented significant economic reforms to stabilize and strengthen Egypt. She managed the country\'s grain supply, reformed taxation, and promoted trade routes connecting Africa, Arabia, and India. She devalued Egyptian currency to boost exports and reduce debt. Her economic policies helped maintain Egyptian prosperity despite political turmoil. She also invested in agriculture and infrastructure projects along the Nile.'
        },
        {
          id: 'leg-5',
          title: 'Legacy and Death',
          description: 'Her final days and lasting impact on history',
          content: 'Following defeat at the Battle of Actium (31 BCE), Cleopatra and Antony retreated to Alexandria. After Antony\'s suicide, Cleopatra took her own life in 30 BCE, reportedly by asp bite, though the exact method remains debated. Her death marked the end of the Ptolemaic dynasty and Egypt became a Roman province. Her legacy endures as a symbol of female power, intelligence, and charisma, inspiring countless works of art, literature, and film throughout history.'
        }
      ]
    },
    'pythagoras': {
      figureName: 'Pythagoras of Samos',
      banks: [
        {
          id: 'bio-1',
          title: 'Life and Origins',
          description: 'The early life and travels of the ancient philosopher',
          content: 'Pythagoras (c. 570-495 BCE) was born on the Greek island of Samos. He traveled extensively in his youth, studying in Egypt, Babylon, and possibly India, absorbing mathematical and philosophical knowledge from various cultures. Around 530 BCE, he emigrated to Croton in southern Italy, where he founded his famous school. He was known for his charismatic teaching style and attracted many devoted followers who formed a close-knit philosophical community.'
        },
        {
          id: 'math-2',
          title: 'Mathematical Contributions',
          description: 'His groundbreaking work in mathematics and geometry',
          content: 'Pythagoras is most famous for the Pythagorean theorem, which states that in a right triangle, the square of the hypotenuse equals the sum of the squares of the other two sides (a² + b² = c²). His school made numerous mathematical discoveries including irrational numbers, the theory of proportions, and the mathematical basis of musical harmony. The Pythagoreans believed that numbers were the fundamental reality of the universe, a concept that influenced mathematics for millennia.'
        },
        {
          id: 'phil-3',
          title: 'Philosophy and Beliefs',
          description: 'His philosophical teachings and worldview',
          content: 'Pythagoras developed a comprehensive philosophical system that combined mathematics, music, astronomy, and ethics. He believed in the transmigration of souls (metempsychosis), teaching that the soul is immortal and moves through different bodies. He advocated for vegetarianism, self-discipline, and moral purity. His famous maxim "All is number" expressed his belief that mathematical relationships underlie all natural phenomena. His philosophy influenced Plato and subsequent Western thought.'
        },
        {
          id: 'school-4',
          title: 'The Pythagorean School',
          description: 'The community and traditions of his followers',
          content: 'The Pythagorean school was both a philosophical academy and a way of life. Members followed strict rules including dietary restrictions, periods of silence, and communal living. They were divided into "mathematikoi" (learners) who studied advanced teachings, and "akousmatikoi" (listeners) who followed basic precepts. The school admitted both men and women, unusual for the time. They kept their discoveries secret, and members were bound by oaths of loyalty and secrecy.'
        },
        {
          id: 'leg-5',
          title: 'Influence and Legacy',
          description: 'His lasting impact on science, philosophy, and music',
          content: 'Pythagoras\'s influence extends across mathematics, philosophy, music theory, and astronomy. His discovery of mathematical ratios in music (the harmonic series) founded the science of acoustics. His emphasis on mathematical proof influenced the development of deductive reasoning. The Pythagorean theorem remains fundamental to geometry and practical applications. His mystical numerology influenced both ancient and medieval thought, and his school\'s traditions influenced later philosophical and religious movements.'
        }
      ]
    },
    'julius caesar': {
      figureName: 'Julius Caesar',
      banks: [
        { id: 'mil-1', title: 'Military Campaigns', description: 'His conquests and military genius', content: 'Gaius Julius Caesar (100-44 BCE) was one of history\'s greatest military commanders. His conquest of Gaul (58-50 BCE) extended Roman territory to the Atlantic Ocean and English Channel. He conducted the first Roman invasions of Britain and Germania. His military innovations included new siege techniques and rapid troop movements. His detailed accounts in "Commentarii de Bello Gallico" remain important historical sources and examples of Latin prose.' },
        { id: 'pol-2', title: 'Political Rise', description: 'His ascent to power in the Roman Republic', content: 'Caesar rose through Roman politics through a combination of military success, political alliances, and popular support. He formed the First Triumvirate with Pompey and Crassus, then served as consul in 59 BCE. After his Gallic conquests, his crossing of the Rubicon River in 49 BCE sparked civil war. He defeated Pompey and became dictator, implementing reforms in the calendar, citizenship laws, and urban planning. He was declared "dictator perpetuo" (dictator in perpetuity) in 44 BCE.' },
        { id: 'ref-3', title: 'Reforms and Achievements', description: 'His lasting contributions to Roman society', content: 'Caesar implemented numerous reforms that shaped Roman society. The Julian calendar, introduced in 45 BCE, remained in use for over 1,600 years and forms the basis of our modern calendar. He granted citizenship to many provincials, reformed the grain dole, reduced debt, and initiated major building projects including the Forum of Caesar. He reformed the Senate, established colonies for veterans, and reorganized local government throughout the empire.' },
        { id: 'death-4', title: 'Assassination and Aftermath', description: 'The conspiracy against him and its consequences', content: 'On the Ides of March (March 15), 44 BCE, Caesar was assassinated by a group of senators led by Brutus and Cassius, who feared his growing power threatened the Republic. He was stabbed 23 times in the Theatre of Pompey. His death sparked another civil war, ultimately leading to the end of the Roman Republic and the rise of the Roman Empire under his adopted heir, Octavian (Augustus). His assassination became one of history\'s most famous political murders.' },
        { id: 'leg-5', title: 'Legacy and Influence', description: 'His enduring impact on history and culture', content: 'Caesar\'s legacy is immense and enduring. His name became synonymous with supreme power, giving us words like "Kaiser" and "Tsar." His writings influenced Latin literature and remain studied today. His military tactics are still analyzed at military academies. The month of July is named after him. His life has inspired countless works of literature, art, and drama, most famously Shakespeare\'s "Julius Caesar." He remains a symbol of ambition, genius, and the dangers of unchecked power.' }
      ]
    },
    'napoleon': {
      figureName: 'Napoleon Bonaparte',
      banks: [
        { id: 'bio', title: 'Rise to Power', description: 'From Corsican soldier to Emperor of France', content: 'Napoleon Bonaparte (1769-1821) was born in Corsica shortly after its annexation by France. He attended military school in France and rose rapidly through army ranks during the French Revolution. His brilliant Italian campaign (1796-1797) made him a national hero. After a coup in 1799, he became First Consul, then crowned himself Emperor in 1804. His meteoric rise from minor nobility to ruler of Europe\'s largest empire remains one of history\'s most remarkable ascents.' },
        { id: 'military', title: 'Military Genius', description: 'His revolutionary tactics and major campaigns', content: 'Napoleon revolutionized warfare through speed, concentration of force, and decisive battle. He won stunning victories at Austerlitz (1805), Jena (1806), and Wagram (1809), defeating larger coalition armies. His Grande Armée was the most powerful military force of its era. He pioneered the corps system, allowing independent maneuvering of army units. His campaigns are still studied at military academies worldwide. Only the disastrous Russian campaign (1812) and final defeat at Waterloo (1815) ended his dominance.' },
        { id: 'reforms', title: 'The Napoleonic Code', description: 'His lasting legal and administrative reforms', content: 'Napoleon\'s most enduring legacy may be the Napoleonic Code (1804), which established equality before law, property rights, and secular authority over religious matters. It became the basis for legal systems in much of Europe and Latin America. He modernized administration, education, and infrastructure throughout his empire. He established the Bank of France, reformed tax collection, and created the lycée system. These reforms spread Enlightenment principles across Europe.' },
        { id: 'empire', title: 'The French Empire', description: 'The extent and impact of his European dominion', content: 'At its height in 1812, Napoleon\'s empire directly controlled or influenced most of continental Europe. He placed family members on thrones in Spain, Italy, and other kingdoms. He redrew the map of Europe, dissolving the Holy Roman Empire and creating new states. His Continental System attempted to economically isolate Britain. Though the empire collapsed, he permanently changed European politics, spreading nationalism and undermining the old aristocratic order.' },
        { id: 'legacy', title: 'Exile and Legend', description: 'His final years and lasting historical impact', content: 'After defeat, Napoleon was exiled to Elba (1814), escaped for the Hundred Days, then was exiled to Saint Helena after Waterloo, where he died in 1821. His legend grew after death - he crafted his own myth through memoirs dictated in exile. He remains a controversial figure: military genius and modernizer to some, tyrant responsible for millions of deaths to others. His impact on European history, law, and warfare is immeasurable.' }
      ]
    },
    'einstein': {
      figureName: 'Albert Einstein',
      banks: [
        { id: 'bio', title: 'Early Life and Education', description: 'His formative years and path to physics', content: 'Albert Einstein (1879-1955) was born in Ulm, Germany, to a Jewish family. Though legend claims he was a poor student, he excelled in mathematics and physics while struggling with rote learning. He failed his first ETH Zurich entrance exam but enrolled after additional preparation. Unable to find academic work after graduation, he took a job at the Swiss Patent Office, where he had time to develop his revolutionary theories. This outsider status may have helped him think unconventionally.' },
        { id: 'relativity', title: 'Theory of Relativity', description: 'His revolutionary understanding of space, time, and gravity', content: 'In 1905, his "miracle year," Einstein published four groundbreaking papers, including special relativity, which showed that space and time are intertwined and that E=mc². In 1915, he completed general relativity, revealing that gravity is the curvature of spacetime caused by mass. These theories overturned Newtonian physics and predicted phenomena like gravitational waves, confirmed a century later. His work fundamentally changed our understanding of the universe.' },
        { id: 'quantum', title: 'Quantum Mechanics', description: 'His contributions and famous debates', content: 'Einstein\'s 1905 paper on the photoelectric effect, explaining light as particles (photons), helped launch quantum mechanics and won him the 1921 Nobel Prize. Ironically, he later became quantum theory\'s most famous critic, uncomfortable with its probabilistic nature. His debates with Niels Bohr are legendary. His EPR paradox, meant to show quantum mechanics was incomplete, later inspired experiments confirming quantum entanglement - "spooky action at a distance" he never accepted.' },
        { id: 'fame', title: 'Public Figure', description: 'His celebrity status and political activism', content: 'After the 1919 eclipse confirmed general relativity, Einstein became the world\'s most famous scientist - a celebrity recognized everywhere. He used this platform to advocate for pacifism, civil rights, and Zionism. When Hitler rose to power, he emigrated to America, joining Princeton\'s Institute for Advanced Study. Though a pacifist, he signed the letter urging FDR to develop atomic weapons, fearing Nazi Germany would do so first - a decision he later called his "one great mistake."' },
        { id: 'legacy', title: 'Scientific Legacy', description: 'His lasting impact on physics and culture', content: 'Einstein transformed physics more than any scientist since Newton. Relativity underlies GPS navigation, nuclear energy, and our understanding of black holes and the Big Bang. His name became synonymous with genius. His iconic image - wild hair, thoughtful gaze - represents science itself. Beyond physics, his philosophical writings on religion, politics, and education remain widely read. He embodied the ideal of the scientist as public intellectual and moral voice.' }
      ]
    },
    'shakespeare': {
      figureName: 'William Shakespeare',
      banks: [
        { id: 'bio', title: 'Life in Stratford and London', description: 'What we know of his personal history', content: 'William Shakespeare (1564-1616) was born in Stratford-upon-Avon to John Shakespeare, a glove-maker and alderman. He married Anne Hathaway at 18 and had three children. By 1592, he was established in London\'s theater world as both actor and playwright. He became a shareholder in the Lord Chamberlain\'s Men (later the King\'s Men) and the Globe Theatre. He retired to Stratford around 1613, dying there in 1616. Despite his fame, many biographical details remain mysterious.' },
        { id: 'plays', title: 'The Dramatic Works', description: 'His tragedies, comedies, and histories', content: 'Shakespeare wrote approximately 37 plays spanning every genre. His tragedies - Hamlet, Macbeth, Othello, King Lear - explore human psychology with unprecedented depth. His comedies, from A Midsummer Night\'s Dream to Twelfth Night, combine wit, romance, and social commentary. His history plays, including Richard III and Henry V, dramatized English history and shaped national identity. His late romances, like The Tempest, blend tragedy and comedy with magical elements.' },
        { id: 'language', title: 'Master of Language', description: 'His revolutionary contributions to English', content: 'Shakespeare invented over 1,700 words still used today, including "assassination," "bedroom," "lonely," and "generous." His phrases permeate English: "break the ice," "heart of gold," "wild goose chase." His blank verse achieved new heights of flexibility and expressiveness. He could write for kings and commoners, mixing high tragedy with bawdy humor. His soliloquies gave audiences access to characters\' inner thoughts in ways theater had never achieved before.' },
        { id: 'themes', title: 'Universal Themes', description: 'Why his works endure across cultures', content: 'Shakespeare\'s plays explore timeless human experiences: love, jealousy, ambition, betrayal, mortality, justice. His characters feel psychologically real - Hamlet\'s indecision, Lady Macbeth\'s guilt, Shylock\'s wounded dignity. He examined power\'s corrupting effects, the nature of identity, the tension between individual desire and social duty. His works adapt to every era and culture, from Kurosawa\'s samurai films to modern political allegories. They remain relevant because human nature hasn\'t changed.' },
        { id: 'legacy', title: 'Cultural Impact', description: 'His influence on literature, theater, and thought', content: 'Shakespeare is the most influential writer in English, perhaps in any language. His plays are performed more than those of any other playwright. Countless writers, from Dickens to Joyce, show his influence. His characters - Hamlet, Falstaff, Romeo and Juliet - have become archetypes. Phrases from his works are quoted constantly, often by people who don\'t know their source. He democratized tragedy, showing that common people\'s sufferings could be as moving as kings\'. He defined what literature could achieve.' }
      ]
    },
    'lincoln': {
      figureName: 'Abraham Lincoln',
      banks: [
        { id: 'bio', title: 'From Log Cabin to White House', description: 'His remarkable rise from poverty', content: 'Abraham Lincoln (1809-1865) was born in a Kentucky log cabin and grew up on the frontier in Indiana and Illinois. Largely self-educated, he read voraciously by firelight. He worked as a rail-splitter, store clerk, surveyor, and postmaster before studying law. He served in the Illinois legislature and one term in Congress. Though he lost the 1858 Senate race to Stephen Douglas, their debates made him nationally known, leading to his 1860 presidential nomination.' },
        { id: 'civil-war', title: 'Commander in Chief', description: 'His leadership during the Civil War', content: 'Lincoln took office as Southern states seceded. He made preserving the Union his paramount goal, managing an unprecedented crisis while learning military strategy. He endured early defeats and incompetent generals before finding Grant. He balanced radical and conservative factions, managed foreign relations to prevent European intervention, and mobilized the North\'s industrial capacity. His leadership transformed a war for Union into a war for freedom, fundamentally reshaping American society.' },
        { id: 'emancipation', title: 'The Great Emancipator', description: 'His role in ending slavery', content: 'Though Lincoln personally opposed slavery, he initially prioritized Union over abolition. The Emancipation Proclamation (1863) freed slaves in Confederate territory, transforming the war\'s purpose and allowing Black soldiers to fight. He pushed the 13th Amendment through Congress, permanently abolishing slavery. His evolving views on race led him to advocate limited Black suffrage by war\'s end. His assassination made him a martyr for freedom, his image forever linked with emancipation.' },
        { id: 'words', title: 'The Power of His Words', description: 'His speeches and literary legacy', content: 'Lincoln was among the greatest writers ever to hold office. The Gettysburg Address, just 272 words, redefined America as a nation "conceived in liberty" and dedicated to equality. His Second Inaugural Address sought reconciliation: "with malice toward none, with charity for all." His letters combined humor, logic, and moral clarity. He could be folksy or eloquent as needed. His words shaped how Americans understand their nation and its ideals.' },
        { id: 'legacy', title: 'The Lincoln Legend', description: 'His assassination and enduring significance', content: 'Lincoln was shot by John Wilkes Booth at Ford\'s Theatre on April 14, 1865, dying the next morning. His death, just days after Lee\'s surrender, transformed him into a national martyr. He consistently ranks as America\'s greatest president. His image adorns the penny and five-dollar bill, and the Lincoln Memorial is a national shrine. He represents American ideals of equality, democracy, and national unity - though his legacy is still debated and reinterpreted.' }
      ]
    },
    'gandhi': {
      figureName: 'Mahatma Gandhi',
      banks: [
        { id: 'bio', title: 'Early Life and South Africa', description: 'His transformation from shy lawyer to activist', content: 'Mohandas Karamchand Gandhi (1869-1948) was born in Gujarat, India. A mediocre student, he studied law in London and then moved to South Africa in 1893. There, experiencing racial discrimination firsthand, he developed his philosophy of nonviolent resistance (satyagraha). Over 21 years in South Africa, he led campaigns for Indian rights, experimenting with civil disobedience. He returned to India in 1915, already known as "Mahatma" (great soul).' },
        { id: 'philosophy', title: 'Satyagraha and Ahimsa', description: 'His revolutionary philosophy of nonviolent resistance', content: 'Gandhi\'s philosophy combined truth (satya), nonviolence (ahimsa), and self-suffering to appeal to opponents\' conscience. Satyagraha ("truth-force") meant resisting injustice through peaceful non-cooperation, accepting punishment without retaliation. He believed this moral force was more powerful than physical force. He drew from Hindu, Jain, Christian, and Tolstoyan ideas. His methods influenced civil rights movements worldwide, from Martin Luther King Jr. to Nelson Mandela.' },
        { id: 'independence', title: 'Indian Independence Movement', description: 'His campaigns against British rule', content: 'Gandhi led major campaigns against British rule: the Non-Cooperation Movement (1920-22), the Salt March (1930), and Quit India (1942). He used boycotts, fasting, and mass civil disobedience. He transformed the Indian National Congress into a mass movement. His simple lifestyle - homespun cloth, vegetarian diet, ashram living - symbolized Indian self-reliance. Though imprisoned repeatedly, he persisted. India gained independence in 1947, though partition into India and Pakistan grieved him deeply.' },
        { id: 'social', title: 'Social Reform', description: 'His campaigns for equality and human dignity', content: 'Gandhi fought not just British rule but Indian social evils. He campaigned against untouchability, calling Dalits "Harijans" (children of God) and including them in his ashrams. He advocated for Hindu-Muslim unity throughout his life. He promoted women\'s education and participation in public life. He championed village self-sufficiency and traditional crafts. His vision of independent India emphasized moral and spiritual renewal alongside political freedom.' },
        { id: 'legacy', title: 'Assassination and Global Impact', description: 'His death and enduring influence', content: 'Gandhi was assassinated on January 30, 1948, by a Hindu nationalist who blamed him for partition and for being too accommodating to Muslims. His death shocked the world. His birthday, October 2, is the International Day of Non-Violence. His methods inspired civil rights movements globally. He remains India\'s "Father of the Nation," though his legacy is debated - celebrated by some, critiqued by others for his views on caste, women, and race.' }
      ]
    },
    'marie curie': {
      figureName: 'Marie Curie',
      banks: [
        { id: 'bio', title: 'From Warsaw to Paris', description: 'Her journey to becoming a scientist', content: 'Maria Sklodowska (1867-1934) was born in Warsaw, then part of the Russian Empire. Barred from university as a woman, she attended underground classes and worked as a governess to fund her sister\'s education, then her own. In 1891, she moved to Paris, studying physics at the Sorbonne. Despite poverty, she earned degrees in physics and mathematics. She met Pierre Curie in 1894; they married in 1895, beginning one of science\'s greatest partnerships.' },
        { id: 'radioactivity', title: 'Discovery of Radioactivity', description: 'Her groundbreaking research on radiation', content: 'Curie coined the term "radioactivity" and discovered that radiation came from atoms themselves, not molecular interactions - a revolutionary insight. Working in a converted shed, she and Pierre discovered two new elements: polonium (named for her homeland) and radium. Her doctoral thesis on radioactive substances was called the greatest ever in physics. This work earned the Curies and Henri Becquerel the 1903 Nobel Prize in Physics - she was the first woman to win a Nobel.' },
        { id: 'second-nobel', title: 'Unprecedented Achievement', description: 'Becoming the only person to win Nobels in two sciences', content: 'After Pierre\'s tragic death in 1906, Marie continued their work alone, taking his professorship - the first woman to teach at the Sorbonne. In 1911, she won the Nobel Prize in Chemistry for discovering radium and polonium and isolating pure radium - making her the only person to win Nobels in two different sciences. Despite a scandal involving an affair with Paul Langevin, her scientific reputation remained secure.' },
        { id: 'war', title: 'Service in World War I', description: 'Her mobile X-ray units and medical contributions', content: 'During World War I, Curie developed mobile X-ray units ("petites Curies") to help surgeons locate bullets and shrapnel in wounded soldiers. She drove these units to the front lines herself and trained 150 women as X-ray operators. She also helped establish radium therapy centers. Her wartime service demonstrated her practical commitment to using science for human benefit, though it further exposed her to dangerous radiation.' },
        { id: 'legacy', title: 'Pioneer and Icon', description: 'Her lasting impact on science and society', content: 'Curie died in 1934 from aplastic anemia, likely caused by radiation exposure - her notebooks are still too radioactive to handle without protection. She broke barriers for women in science, though she faced persistent sexism. Her daughter Irène also won a Nobel Prize in Chemistry. Marie Curie remains the most famous woman scientist, symbolizing dedication, brilliance, and the sacrifices of scientific discovery. Her life inspired countless women to pursue science.' }
      ]
    },
    'martin luther king': {
      figureName: 'Martin Luther King Jr.',
      banks: [
        { id: 'bio', title: 'Early Life and Ministry', description: 'His path to leadership', content: 'Martin Luther King Jr. (1929-1968) was born in Atlanta, Georgia, to a family of Baptist ministers. A gifted student, he entered Morehouse College at 15 and earned a doctorate in theology from Boston University. He became pastor of Dexter Avenue Baptist Church in Montgomery, Alabama, in 1954. His education in theology, philosophy, and Gandhi\'s teachings prepared him to lead a movement that would transform America.' },
        { id: 'montgomery', title: 'Montgomery Bus Boycott', description: 'His emergence as a civil rights leader', content: 'When Rosa Parks was arrested for refusing to give up her bus seat in December 1955, the 26-year-old King was chosen to lead the Montgomery Bus Boycott. For 381 days, Black residents refused to ride city buses. Despite bombings and arrests, they persevered. The Supreme Court ruled bus segregation unconstitutional. King emerged as a national figure, demonstrating that nonviolent resistance could challenge Jim Crow. He founded the Southern Christian Leadership Conference in 1957.' },
        { id: 'dream', title: 'The Dream and the March', description: 'The 1963 March on Washington and his famous speech', content: 'The 1963 March on Washington brought 250,000 people to the Lincoln Memorial, the largest demonstration in American history to that point. King\'s "I Have a Dream" speech became the defining moment of the civil rights movement. His vision of a nation where people "will not be judged by the color of their skin but by the content of their character" articulated America\'s highest ideals. The march helped pass the Civil Rights Act of 1964.' },
        { id: 'later', title: 'Beyond Civil Rights', description: 'His expanding vision of justice', content: 'After the Voting Rights Act of 1965, King broadened his focus. He campaigned against poverty, launching the Poor People\'s Campaign. He spoke out against the Vietnam War, calling America "the greatest purveyor of violence in the world." These positions cost him support from some allies and intensified FBI surveillance. He went to Memphis in 1968 to support striking sanitation workers, connecting labor rights to civil rights.' },
        { id: 'legacy', title: 'Assassination and Legacy', description: 'His death and enduring influence', content: 'King was assassinated in Memphis on April 4, 1968, by James Earl Ray. His death sparked riots in cities nationwide. He was 39 years old. His birthday became a federal holiday in 1986. His philosophy of nonviolent resistance and his vision of a "beloved community" continue to inspire movements for justice worldwide. Though sometimes sanitized, his radical critique of racism, poverty, and militarism remains challenging and relevant.' }
      ]
    },
    'queen elizabeth i': {
      figureName: 'Elizabeth I',
      banks: [
        { id: 'bio', title: 'The Princess in Peril', description: 'Her dangerous path to the throne', content: 'Elizabeth I (1533-1603) was the daughter of Henry VIII and Anne Boleyn. When her mother was executed for treason, Elizabeth was declared illegitimate. She survived the reigns of her half-brother Edward VI and half-sister Mary I, during which she was imprisoned in the Tower of London. Her Protestant faith made her a threat to Catholic Mary. She learned caution, diplomacy, and the art of political survival. She became queen in 1558 at age 25.' },
        { id: 'settlement', title: 'The Religious Settlement', description: 'Her establishment of the Church of England', content: 'Elizabeth inherited a nation divided by religion after decades of Protestant-Catholic conflict. She established a moderate Protestant settlement that became the foundation of the Church of England. The Elizabethan Settlement required outward conformity but avoided inquiry into private beliefs. Though Catholics faced persecution, especially after the Pope excommunicated her, England avoided the religious wars devastating France. Her approach created a distinctly English church.' },
        { id: 'politics', title: 'The Virgin Queen', description: 'Her strategic use of marriage and image', content: 'Elizabeth never married, using her eligibility as a diplomatic tool throughout her reign. She cultivated the image of the "Virgin Queen," married to England. Her elaborate iconography portrayed her as Gloriana, a semi-divine figure. She managed a male-dominated court through a combination of charm, intelligence, and calculated unpredictability. Her famous speeches, including the address at Tilbury before the Spanish Armada, demonstrated her rhetorical power.' },
        { id: 'armada', title: 'Defeat of the Spanish Armada', description: 'England\'s triumph over Spanish invasion', content: 'In 1588, Philip II of Spain launched the Armada to invade England and restore Catholicism. Elizabeth rallied her troops at Tilbury: "I know I have the body of a weak and feeble woman; but I have the heart and stomach of a king." English ships and storms destroyed the Spanish fleet. The victory established England as a major naval power and cemented Elizabeth\'s legendary status. It marked the beginning of England\'s rise as a global power.' },
        { id: 'legacy', title: 'The Elizabethan Age', description: 'Her reign\'s cultural and political achievements', content: 'Elizabeth\'s 45-year reign saw unprecedented cultural flowering: Shakespeare, Marlowe, and Spenser transformed English literature. Explorers like Drake and Raleigh expanded English horizons. The economy grew and the middle class expanded. She left England more unified, prosperous, and confident than she found it. Called "Good Queen Bess," she remains one of England\'s most beloved monarchs. Her reign proved that a woman could rule as effectively as any king.' }
      ]
    },
    'confucius': {
      figureName: 'Confucius',
      banks: [
        { id: 'bio', title: 'Life and Times', description: 'The wandering teacher of ancient China', content: 'Confucius (551-479 BCE) was born in the state of Lu during China\'s turbulent Spring and Autumn period. Orphaned young, he was largely self-educated. He held minor government posts before becoming a teacher, attracting disciples from various social classes. Unable to find a ruler who would implement his ideas, he wandered for years seeking employment. He spent his final years in Lu, teaching and editing classical texts. He saw himself as transmitting ancient wisdom, not creating new doctrines.' },
        { id: 'teachings', title: 'Core Teachings', description: 'The principles of Confucian philosophy', content: 'Confucius taught that social harmony comes from individuals fulfilling their proper roles with virtue. He emphasized ren (benevolence/humaneness), li (ritual propriety), xiao (filial piety), and junzi (the gentleman/exemplary person). He believed education could transform anyone and that rulers should govern by moral example. He focused on this-worldly ethics rather than metaphysics. His teachings were collected by disciples in the Analects after his death.' },
        { id: 'relationships', title: 'The Five Relationships', description: 'His social philosophy', content: 'Confucius defined five key relationships: ruler-subject, parent-child, husband-wife, elder-younger sibling, and friend-friend. Each involves reciprocal duties: superiors must care for inferiors, who owe respect and obedience. This hierarchy aimed at social harmony, not oppression. He believed that if families were harmonious, the state would be well-governed. His emphasis on family loyalty and social obligation shaped Chinese culture for millennia.' },
        { id: 'impact', title: 'Confucianism as State Ideology', description: 'How his teachings shaped Chinese civilization', content: 'During the Han Dynasty (206 BCE-220 CE), Confucianism became China\'s official ideology. The civil service examination system, based on Confucian classics, selected officials for nearly 2,000 years. Confucian temples were built throughout China. His teachings shaped education, family structure, and governance across East Asia, including Korea, Japan, and Vietnam. Neo-Confucianism in later centuries integrated Buddhist and Taoist elements.' },
        { id: 'legacy', title: 'Modern Relevance', description: 'His continuing influence today', content: 'Confucius remains the most influential thinker in Chinese history. Though attacked during China\'s Cultural Revolution as "feudal," his teachings have been rehabilitated. Confucian values of education, family loyalty, and social harmony persist throughout East Asia. Debates continue about whether Confucianism can coexist with democracy and human rights. His emphasis on moral self-cultivation and social responsibility offers wisdom for any era facing ethical challenges.' }
      ]
    },
    'frida kahlo': {
      figureName: 'Frida Kahlo',
      banks: [
        { id: 'bio', title: 'Life and Suffering', description: 'Her formative experiences and struggles', content: 'Frida Kahlo (1907-1954) was born in Coyoacán, Mexico. Childhood polio weakened her right leg. At 18, a bus accident nearly killed her, leaving her with lifelong pain and requiring over 30 surgeries. During recovery, she began painting. She married muralist Diego Rivera in 1929; their tempestuous relationship, including divorce and remarriage, profoundly affected her art. She had multiple affairs with both men and women and suffered miscarriages she desperately wanted to carry to term.' },
        { id: 'art', title: 'The Art of Self-Expression', description: 'Her unique style and self-portraits', content: 'Kahlo created approximately 200 paintings, including 55 self-portraits. Her style combined elements of Mexican folk art, surrealism (though she rejected the label), and unflinching depictions of physical and emotional pain. She painted her broken body, miscarriages, and heartbreak with symbolic imagery: thorns, nails, monkeys, and hearts. Her work was deeply personal yet touched universal themes of identity, suffering, and resilience.' },
        { id: 'mexican', title: 'Mexican Identity', description: 'Her celebration of indigenous culture', content: 'Kahlo embraced Mexican identity at a time when elites looked to Europe. She wore traditional Tehuana dresses, incorporated pre-Columbian symbolism, and celebrated mestizo heritage. She and Rivera were passionate about Mexican culture and politics. Her art drew from ex-votos (devotional paintings), folk imagery, and Aztec mythology. She helped define modern Mexican identity while asserting women\'s voices in a male-dominated art world.' },
        { id: 'politics', title: 'Revolutionary Politics', description: 'Her commitment to communism and activism', content: 'Kahlo was a committed communist throughout her life. She and Rivera hosted Leon Trotsky during his Mexican exile (Kahlo had an affair with him). She joined the Communist Party, left, and rejoined. Her later paintings became more explicitly political. Despite physical decline, she attended a protest against U.S. intervention in Guatemala just days before her death. She saw art and politics as inseparable expressions of her revolutionary beliefs.' },
        { id: 'legacy', title: 'Icon and Feminist Symbol', description: 'Her rediscovery and cultural impact', content: 'Relatively obscure at her death, Kahlo was rediscovered in the 1970s-80s by feminists and Chicano artists. She became a global icon, her face appearing everywhere from museums to merchandise. Her unflinching self-representation inspired countless artists. She symbolizes female creativity, resilience, and authenticity. The "Fridamania" phenomenon raises questions about commercialization, but her art\'s raw emotional power ensures her lasting importance beyond the iconography.' }
      ]
    }
  };

  // Also add common name variations and aliases
  const aliases = {
    'da vinci': 'leonardo',
    'davinci': 'leonardo',
    'leonardo da vinci': 'leonardo',
    'alexander the great': 'alexander',
    'julius caesar': 'julius caesar',
    'caesar': 'julius caesar',
    'queen cleopatra': 'cleopatra',
    'cleopatra vii': 'cleopatra',
    'napoleon bonaparte': 'napoleon',
    'bonaparte': 'napoleon',
    'albert einstein': 'einstein',
    'william shakespeare': 'shakespeare',
    'abraham lincoln': 'lincoln',
    'mahatma gandhi': 'gandhi',
    'mohandas gandhi': 'gandhi',
    'marie sklodowska curie': 'marie curie',
    'madame curie': 'marie curie',
    'curie': 'marie curie',
    'dr. martin luther king': 'martin luther king',
    'mlk': 'martin luther king',
    'dr. king': 'martin luther king',
    'queen elizabeth': 'queen elizabeth i',
    'elizabeth tudor': 'queen elizabeth i',
    'the virgin queen': 'queen elizabeth i',
    'frida': 'frida kahlo',
    'kahlo': 'frida kahlo'
  };

  // Check aliases first
  for (const [alias, key] of Object.entries(aliases)) {
    if (nameLower.includes(alias) && fallbackData[key]) {
      return fallbackData[key];
    }
  }

  // Check for exact or partial matches
  for (const [key, data] of Object.entries(fallbackData)) {
    if (nameLower.includes(key) || key.includes(nameLower)) {
      return data;
    }
  }

  // Generate informative generic knowledge banks for unknown figures
  // These provide a useful structure even without specific content
  return {
    figureName: figureName,
    banks: [
      {
        id: 'bio',
        title: 'Biography and Origins',
        description: `The life story and background of ${figureName}`,
        content: `${figureName}'s biography encompasses their birth, family background, education, and the key events that shaped their early life. Understanding where they came from and how they were raised provides essential context for their later achievements. Their upbringing, mentors, and early experiences often foreshadowed the path they would take in history.`
      },
      {
        id: 'achievements',
        title: 'Major Achievements',
        description: `The most significant accomplishments of ${figureName}`,
        content: `${figureName} is remembered for achievements that left a lasting mark on history. These accomplishments, whether in leadership, discovery, creation, or reform, define why they are studied today. Each achievement was the product of their unique talents, circumstances, and the opportunities of their era, demonstrating what one individual can accomplish.`
      },
      {
        id: 'context',
        title: 'Historical Context',
        description: `The world and era in which ${figureName} lived`,
        content: `${figureName} lived during a specific historical period with its own challenges, opportunities, and social norms. Understanding the political climate, technological capabilities, cultural values, and major events of their time helps explain both the constraints they faced and the opportunities they seized. No historical figure can be understood apart from their era.`
      },
      {
        id: 'beliefs',
        title: 'Philosophy and Beliefs',
        description: `The ideas and values that guided ${figureName}`,
        content: `${figureName}'s actions were guided by their beliefs, values, and worldview. Whether religious, philosophical, political, or personal, these core convictions motivated their decisions and shaped their legacy. Understanding what they believed helps explain why they made the choices they did and what they hoped to achieve.`
      },
      {
        id: 'legacy',
        title: 'Legacy and Influence',
        description: `The lasting impact of ${figureName} on later generations`,
        content: `${figureName}'s influence extends far beyond their own lifetime. Their ideas, achievements, or example have shaped subsequent generations, movements, and developments. Their legacy can be seen in how they are remembered, studied, and invoked today. Understanding their lasting impact reveals why they remain relevant to our understanding of history.`
      }
    ]
  };
}

// Function to render knowledge bank items
function renderKnowledgeBanks(data) {
  const list = document.getElementById('knowledge-banks-list');
  list.innerHTML = '';

  if (!data || !data.banks || data.banks.length === 0) {
    list.innerHTML = '<p class="helper-text">No knowledge banks found for this figure.</p>';
    return;
  }

  // Create items for each knowledge bank
  data.banks.forEach((bank, index) => {
    const item = document.createElement('div');
    item.className = 'knowledge-bank-item';
    item.innerHTML = `
      <input type="checkbox" class="kb-checkbox" id="kb-${index}" data-index="${index}">
      <div class="kb-content">
        <div class="kb-title">${bank.title}</div>
        <div class="kb-description">${bank.description}</div>
      </div>
    `;

    // Store the content data on the element
    item.dataset.content = bank.content;
    item.dataset.title = bank.title;

    // Toggle selection on click
    item.addEventListener('click', (e) => {
      if (e.target.tagName !== 'INPUT') {
        const checkbox = item.querySelector('.kb-checkbox');
        checkbox.checked = !checkbox.checked;
        item.classList.toggle('selected', checkbox.checked);
      }
    });

    // Handle checkbox change directly
    const checkbox = item.querySelector('.kb-checkbox');
    checkbox.addEventListener('change', () => {
      item.classList.toggle('selected', checkbox.checked);
    });

    list.appendChild(item);
  });

  // Add "Add Selected" button
  const addBtn = document.createElement('button');
  addBtn.className = 'kb-add-btn';
  addBtn.textContent = 'Add Selected Knowledge Banks';
  addBtn.addEventListener('click', addSelectedKnowledgeBanks);
  list.appendChild(addBtn);
}

// Function to add selected knowledge banks as documents
function addSelectedKnowledgeBanks() {
  const items = document.querySelectorAll('.knowledge-bank-item');
  let addedCount = 0;

  items.forEach(item => {
    const checkbox = item.querySelector('.kb-checkbox');
    if (checkbox && checkbox.checked) {
      const title = item.dataset.title;
      const content = item.dataset.content;

      // Check document limit
      if (state.documents.length >= 10) {
        alert('Maximum document limit (10) reached.');
        return;
      }

      // Add as a document
      state.documents.push({
        name: `📚 ${title}`,
        content: content,
        type: 'text/plain',
        isKnowledgeBank: true
      });

      addedCount++;

      // Uncheck the item
      checkbox.checked = false;
      item.classList.remove('selected');
    }
  });

  if (addedCount > 0) {
    updateDocumentsList();
    alert(`Added ${addedCount} knowledge bank(s) to your documents.`);
  } else {
    alert('Please select at least one knowledge bank to add.');
  }
}

// Add event listener for search button
document.addEventListener('DOMContentLoaded', () => {
  const searchKnowledgeBtn = document.getElementById('search-knowledge-btn');
  if (searchKnowledgeBtn) {
    searchKnowledgeBtn.addEventListener('click', searchKnowledgeBanks);
  }
});

// Log that script has fully loaded
console.log("App.js v2.3 - Fixed asterisk removal + stronger no-stage-directions prompt");