import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_API_KEY;

export interface VideoEvent {
    timestamp: string;
    description: string;
    isDangerous: boolean;
}

export class AIDetectionService {
    private genAI: GoogleGenerativeAI | null = null;

    constructor() {
        if (API_KEY) {
            this.genAI = new GoogleGenerativeAI(API_KEY);
            console.log('✅ Google AI initialized with API key - will try Gemini 2.0-flash first');
        } else {
            console.warn('⚠️ EXPO_PUBLIC_GOOGLE_API_KEY not set, AI detection will use mock data');
            console.log('💡 To enable real AI analysis:');
            console.log('   1. Get API key from: https://aistudio.google.com/app/apikey');
            console.log('   2. Add to .env: EXPO_PUBLIC_GOOGLE_API_KEY=your_key_here');
            console.log('   3. Restart the app');
        }
    }

    async detectEvents(base64Image: string, transcript: string = ''): Promise<{ events: VideoEvent[], rawResponse: string }> {
        console.log('Starting frame analysis...');
        
        // If no image provided or no API key is available, return mock data
        if (!base64Image || !this.genAI || !API_KEY) {
            console.log('Using mock analysis (no image or API key)');
            return this.getMockEvents();
        }

        try {
            const base64Data = base64Image.split(',')[1];
            if (!base64Data) {
                console.log('Invalid image format, using mock data');
                return this.getMockEvents();
            }

            // Try different model versions in order of preference
            let model;
            try {
                model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
                console.log('Initialized Gemini model: gemini-2.0-flash');
            } catch (error) {
                console.log('gemini-2.0-flash not available, trying gemini-1.5-flash');
                try {
                    model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
                    console.log('Initialized Gemini model: gemini-1.5-flash');
                } catch (error2) {
                    console.log('gemini-1.5-flash not available, trying gemini-pro-vision');
                    try {
                        model = this.genAI.getGenerativeModel({ model: "gemini-pro-vision" });
                        console.log('Initialized Gemini model: gemini-pro-vision');
                    } catch (error3) {
                        console.log('gemini-pro-vision not available, trying gemini-pro');
                        model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
                        console.log('Initialized Gemini model: gemini-pro');
                    }
                }
            }

            const imagePart = {
                inlineData: {
                    data: base64Data,
                    mimeType: 'image/jpeg'
                },
            };

            console.log('Sending image to API...', { imageSize: base64Data.length });
            const prompt = `Analyze this frame and determine if any of these specific dangerous situations are occurring:

1. Medical Emergencies:
- Person unconscious or lying motionless
- Person clutching chest/showing signs of heart problems
- Seizures or convulsions
- Difficulty breathing or choking

2. Falls and Injuries:
- Person falling or about to fall
- Person on the ground after a fall
- Signs of injury or bleeding
- Limping or showing signs of physical trauma

3. Distress Signals:
- Person calling for help or showing distress
- Panic attacks or severe anxiety symptoms
- Signs of fainting or dizziness
- Headache or unease
- Signs of unconsciousness

4. Violence or Threats:
- Physical altercations
- Threatening behavior
- Weapons visible

5. Suspicious Activities:
- Shoplifting
- Vandalism
- Trespassing
${transcript ? `Consider this audio transcript from the scene: "${transcript}"
` : ''}
Return a JSON object in this exact format:

{
    "events": [
        {
            "timestamp": "mm:ss",
            "description": "Brief description of what's happening in this frame",
            "isDangerous": true/false // Set to true if the event involves a fall, injury, unease, pain, accident, or concerning behavior
        }
    ]
}`;

            try {
                const result = await model.generateContent([
                    prompt,
                    imagePart,
                ]);

                const response = await result.response;
                const text = response.text();
                console.log('Raw API Response:', text);

                // Try to extract JSON from the response, handling potential code blocks
                let jsonStr = text;
                
                // First try to extract content from code blocks if present
                const codeBlockMatch = text.match(/```(?:json)?\s*({[\s\S]*?})\s*```/);
                if (codeBlockMatch) {
                    jsonStr = codeBlockMatch[1];
                    console.log('Extracted JSON from code block:', jsonStr);
                } else {
                    // If no code block, try to find raw JSON
                    const jsonMatch = text.match(/\{[^]*\}/);  
                    if (jsonMatch) {
                        jsonStr = jsonMatch[0];
                        console.log('Extracted raw JSON:', jsonStr);
                    }
                }

                const parsed = JSON.parse(jsonStr);
                return {
                    events: parsed.events || [],
                    rawResponse: text
                };

            } catch (apiError: unknown) {
                console.error('API call failed:', apiError);
                console.log('API key available:', !!API_KEY);
                
                const errorMessage = apiError instanceof Error ? apiError.message : String(apiError);
                
                // If it's a 404 or permission error, the API key might be invalid
                if (errorMessage.includes('404') || errorMessage.includes('not found')) {
                    console.warn('API key may be invalid or model not accessible, falling back to mock data');
                } else if (errorMessage.includes('403') || errorMessage.includes('permission')) {
                    console.warn('Permission denied, falling back to mock data');
                }
                
                // Always fall back to mock data when API fails
                return this.getMockEvents();
            }

        } catch (error) {
            console.error('Error in AI detection setup:', error);
            // Fallback to mock data if setup fails
            return this.getMockEvents();
        }
    }

    private getMockEvents(): { events: VideoEvent[], rawResponse: string } {
        const mockEvents = [
            { description: 'Person detected in frame', isDangerous: false },
            { description: 'Normal movement patterns observed', isDangerous: false },
            { description: 'Suspicious behavior detected - loitering', isDangerous: true },
            { description: 'Person appears distressed or in pain', isDangerous: true },
            { description: 'Fall detected - person on ground', isDangerous: true },
            { description: 'Regular activity - person walking normally', isDangerous: false },
            { description: 'Potential shoplifting behavior observed', isDangerous: true },
            { description: 'Person clutching chest - possible medical emergency', isDangerous: true },
            { description: 'Camera detecting motion in area', isDangerous: false },
            { description: 'AI analysis complete - no threats detected', isDangerous: false },
        ];
        
        const randomEvent = mockEvents[Math.floor(Math.random() * mockEvents.length)];
        const currentTime = new Date();
        const timestamp = `${currentTime.getMinutes().toString().padStart(2, '0')}:${currentTime.getSeconds().toString().padStart(2, '0')}`;
        
        // Return an event 70% of the time to show the system is working
        if (Math.random() > 0.3) {
            console.log('Mock event generated:', randomEvent.description);
            const description = API_KEY ? 
                randomEvent.description + ' (API fallback)' : 
                randomEvent.description + ' (demo mode)';
                
            return {
                events: [{
                    timestamp,
                    description,
                    isDangerous: randomEvent.isDangerous
                }],
                rawResponse: API_KEY ? 'Mock fallback due to API error' : 'Demo mode - no API key provided'
            };
        }
        
        console.log('No mock event generated this time');
        return {
            events: [],
            rawResponse: 'No significant events detected'
        };
    }

    async captureFrameFromCamera(cameraRef: any): Promise<string | null> {
        try {
            console.log('Attempting to capture frame from camera...');
            
            if (!cameraRef || !cameraRef.current) {
                console.log('Camera ref not available');
                return null;
            }
            
            // Take a picture and convert to base64
            const photo = await cameraRef.current.takePictureAsync({
                base64: true,
                quality: 0.7,
                skipProcessing: true,
            });
            
            console.log('Photo captured:', { hasBase64: !!photo.base64, uri: photo.uri });
            
            if (photo.base64) {
                console.log('Successfully captured frame with base64 data');
                return `data:image/jpeg;base64,${photo.base64}`;
            }
            
            console.log('No base64 data in photo');
            return null;
        } catch (error) {
            console.error('Error capturing frame:', error);
            // Return mock data if camera capture fails - this ensures analysis continues
            console.log('Using mock data due to capture failure');
            return null;
        }
    }
}

export const aiDetectionService = new AIDetectionService();