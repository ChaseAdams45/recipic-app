import * as React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

export default function LoadingScreen() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="orange" />
      <Text style={styles.loadingText}>Processing...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "black",
  },
  loadingText: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 8,
  },
});
