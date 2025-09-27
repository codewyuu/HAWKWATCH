import { View, Text, StyleSheet, TouchableOpacity, Alert, Dimensions, FlatList } from 'react-native'
import { useState, useRef, useEffect } from 'react'
import { Camera, CameraView } from 'expo-camera'
import { Ionicons } from '@expo/vector-icons'
import { aiDetectionService, VideoEvent } from '../../lib/aiDetection'
import { GeminiFooter } from '../../components/gemini-footer'
import { NotificationService } from '../../lib/notifications'

interface Timestamp {
  timestamp: string
  description: string
  isDangerous: boolean
}

export default function LiveAnalysisScreen() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [timestamps, setTimestamps] = useState<Timestamp[]>([])
  const [transcript, setTranscript] = useState('')
  const [facing, setFacing] = useState<'front' | 'back'>('back')
  const cameraRef = useRef<CameraView>(null)

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync()
      setHasPermission(status === 'granted')
      
      // Initialize notifications
      const notificationPermission = await NotificationService.initialize()
      if (!notificationPermission) {
        Alert.alert('Notification permission required for security alerts')
      }
    })()
  }, [])

  const startRecording = async () => {
    if (!cameraRef.current) return

    try {
      setIsRecording(true)
      setIsAnalyzing(true)
      
      // Start real-time analysis (simplified for mobile)
      startAnalysisLoop()
      
    } catch (error) {
      console.error('Error starting recording:', error)
      Alert.alert('Error', 'Failed to start recording')
      setIsRecording(false)
      setIsAnalyzing(false)
    }
  }

  const sendSecurityAlert = async (description: string) => {
    // Send push notification using the notification service
    await NotificationService.sendSecurityAlert(description, 'high')
    
    // Show in-app alert
    Alert.alert(
      '⚠️ Security Alert', 
      description, 
      [
        { 
          text: 'View Details', 
          onPress: () => console.log('Security alert details requested'),
          style: 'default' 
        },
        { 
          text: 'Acknowledge', 
          style: 'cancel' 
        }
      ],
      { cancelable: false }
    )
  }

  const stopRecording = () => {
    setIsRecording(false)
    setIsAnalyzing(false)
  }

  const startAnalysisLoop = () => {
    console.log('Starting analysis loop...')
    // Run analysis every 3 seconds
    const interval = setInterval(() => {
      if (!isRecording) {
        console.log('Recording stopped, clearing analysis interval')
        clearInterval(interval)
        return
      }
      
      console.log('Running scheduled analysis...')
      analyzeFrame()
    }, 3000)
    
    // Run first analysis immediately
    setTimeout(() => {
      console.log('Running initial analysis...')
      analyzeFrame()
    }, 500)
  }

  const analyzeFrame = async () => {
    try {
      console.log('Starting frame analysis...')
      
      // Capture frame from camera
      const base64Image = await aiDetectionService.captureFrameFromCamera(cameraRef)
      
      if (!base64Image) {
        console.log('No frame captured, skipping analysis')
        return
      }

      console.log('Analyzing captured frame with AI...')
      
      // Use AI detection service with real image
      const { events } = await aiDetectionService.detectEvents(base64Image, transcript)
      
      console.log('AI Analysis completed, events found:', events.length)
      
      // Process detected events (only real events, no mock data)
      events.forEach(event => {
        const newTimestamp: Timestamp = {
          timestamp: event.timestamp,
          description: event.description,
          isDangerous: event.isDangerous
        }
        
        setTimestamps(prev => [...prev, newTimestamp])
        
        // Send security alert for dangerous events
        if (event.isDangerous) {
          sendSecurityAlert(event.description)
        }
      })

    } catch (error) {
      console.error('Analysis error:', error)
      // Log error but don't create mock events - only show real detections
    }
  }

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'))
  }

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Requesting camera permission...</Text>
      </View>
    )
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>No access to camera</Text>
        <TouchableOpacity 
          style={styles.button}
          onPress={() => Camera.requestCameraPermissionsAsync()}
        >
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🦅 Live Security Analysis</Text>
        <Text style={styles.subtitle}>AI-powered real-time monitoring</Text>
      </View>

      <View style={styles.cameraContainer}>
        <CameraView 
          ref={cameraRef}
          style={styles.camera}
          facing={facing}
        >
          <View style={styles.cameraOverlay}>
            {isAnalyzing && (
              <View style={styles.analysisIndicator}>
                <Text style={styles.analysisText}>🤖 Analyzing...</Text>
              </View>
            )}
          </View>
        </CameraView>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity 
          style={styles.flipButton}
          onPress={toggleCameraFacing}
        >
          <Ionicons name="camera-reverse" size={24} color="#ffffff" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.recordButton, isRecording && styles.recordingButton]}
          onPress={isRecording ? stopRecording : startRecording}
        >
          <Ionicons 
            name={isRecording ? "stop" : "play"} 
            size={32} 
            color="#ffffff" 
          />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.flipButton}
          onPress={() => setTimestamps([])}
        >
          <Ionicons name="trash" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <View style={styles.timeline}>
        <View style={styles.timelineHeader}>
          <Text style={styles.timelineTitle}>Event Timeline ({timestamps.length})</Text>
          <GeminiFooter />
        </View>
        <FlatList
          data={timestamps}
          keyExtractor={(item, index) => index.toString()}
          style={styles.timestampList}
          showsVerticalScrollIndicator={true}
          renderItem={({ item }) => (
            <View 
              style={[
                styles.timestampItem,
                item.isDangerous && styles.dangerousItem
              ]}
            >
              <Text style={styles.timestampTime}>{item.timestamp}</Text>
              <Text style={styles.timestampDesc}>{item.description}</Text>
              {item.isDangerous && (
                <Text style={styles.dangerTag}>⚠️ ALERT</Text>
              )}
            </View>
          )}
          ListEmptyComponent={() => (
            <Text style={styles.emptyText}>No events detected yet</Text>
          )}
          inverted={true}
        />
      </View>
    </View>
  )
}

const { width, height } = Dimensions.get('window')

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    textShadowColor: 'rgba(255, 255, 255, 0.7)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#9C27B0',
    marginTop: 5,
  },
  cameraContainer: {
    flex: 1,
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    padding: 16,
  },
  analysisIndicator: {
    backgroundColor: 'rgba(156, 39, 176, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  analysisText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingButton: {
    backgroundColor: '#ef4444',
  },
  flipButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeline: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 20,
    minHeight: 150,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  timestampList: {
    flex: 1,
    maxHeight: 200,
  },
  timestampItem: {
    backgroundColor: '#1f2937',
    padding: 12,
    marginVertical: 2,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#374151',
  },
  dangerousItem: {
    backgroundColor: '#991b1b',
    borderLeftColor: '#ef4444',
  },
  timestampTime: {
    color: '#9C27B0',
    fontSize: 12,
    fontWeight: '600',
  },
  timestampDesc: {
    color: '#ffffff',
    fontSize: 14,
    marginTop: 2,
  },
  dangerTag: {
    color: '#fbbf24',
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 4,
  },
  emptyText: {
    color: '#6b7280',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
  text: {
    color: '#ffffff',
    fontSize: 16,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#9C27B0',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 20,
    alignSelf: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
})
