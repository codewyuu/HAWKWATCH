import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'

export class NotificationService {
  static async initialize() {
    // Configure notification handler
    await Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    })
    // Request permissions
    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
        allowCriticalAlerts: true,
      },
    })

    if (status !== 'granted') {
      console.warn('Notification permission not granted')
      return false
    }

    // Configure notification categories for iOS
    if (Platform.OS === 'ios') {
      await Notifications.setNotificationCategoryAsync('security', [
        {
          identifier: 'view_details',
          buttonTitle: 'View Details',
          options: { isDestructive: false, isAuthenticationRequired: false },
        },
        {
          identifier: 'acknowledge',
          buttonTitle: 'Acknowledge',
          options: { isDestructive: false, isAuthenticationRequired: false },
        },
      ])
    }

    return true
  }

  static async sendSecurityAlert(description: string, severity: 'high' | 'medium' | 'low' = 'high') {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⚠️ HawkWatch Security Alert',
          body: description,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
          color: severity === 'high' ? '#ef4444' : severity === 'medium' ? '#f59e0b' : '#10b981',
          categoryIdentifier: 'security',
          data: {
            type: 'security_alert',
            severity,
            timestamp: Date.now(),
          },
        },
        trigger: null, // Send immediately
      })
    } catch (error) {
      console.error('Failed to send security alert notification:', error)
    }
  }

  static async sendEventNotification(eventType: string, description: string) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `📹 HawkWatch Event: ${eventType}`,
          body: description,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.DEFAULT,
          color: '#9C27B0',
          data: {
            type: 'event_notification',
            eventType,
            timestamp: Date.now(),
          },
        },
        trigger: null,
      })
    } catch (error) {
      console.error('Failed to send event notification:', error)
    }
  }

  static async clearAllNotifications() {
    await Notifications.dismissAllNotificationsAsync()
  }

  static async cancelAllScheduledNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync()
  }
}