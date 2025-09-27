import React from 'react'
import { View, Text, Image, StyleSheet } from 'react-native'

export function GeminiFooter() {
  return (
    <View style={styles.container}>
      <Text style={styles.poweredText}>Powered by</Text>
      <Image
        source={{
          uri: "https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg"
        }}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.geminiText}>Gemini 2.0-flash</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  poweredText: {
    fontSize: 12,
    color: '#6b7280',
  },
  logo: {
    width: 20,
    height: 20,
  },
  geminiText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#ffffff',
  },
})
