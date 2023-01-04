// Import dependencies
import * as React from "react";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Button,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Camera, Canvas, Image } from "react-native-pytorch-core";
import * as eva from '@eva-design/eva';
import { ApplicationProvider, Layout } from '@ui-kitten/components';

import detectObjects from "./ObjectDetector";
import CameraScreen from "./screens/CameraScreen";
import LoadingScreen from "./screens/LoadingScreen";
import ResultsScreen from "./screens/ResultsScreen";

const ScreenStates = {
  CAMERA: 0,
  LOADING: 1,
  RESULTS: 2,
};

export default function YOLOv5Example() {
  const [image, setImage] = useState(null);
  const [boundingBoxes, setBoundingBoxes] = useState(null);
  const [screenState, setScreenState] = useState(ScreenStates.CAMERA);

  // Handle the reset button and return to the camera capturing mode
  const handleReset = useCallback(async () => {
    setScreenState(ScreenStates.CAMERA);
    if (image != null) {
      await image.release();
    }
    setImage(null);
    setBoundingBoxes(null);
  }, [image, setScreenState]);

  // This handler function handles the camera's capture event
  async function handleImage(capturedImage) {
    setImage(capturedImage);
    // Wait for image to process through YOLOv5 model and draw resulting image
    setScreenState(ScreenStates.LOADING);
    try {
      const newBoxes = await detectObjects(capturedImage);
      setBoundingBoxes(newBoxes);
      // Switch to the ResultsScreen to display the detected objects
      setScreenState(ScreenStates.RESULTS);
    } catch (err) {
      // In case something goes wrong, go back to the CameraScreen to take a new picture
      handleReset();
    }
  }

  return (
    <ApplicationProvider {...eva} theme={eva.dark}>
      <SafeAreaView style={styles.container}>
        {screenState === ScreenStates.CAMERA && (
          <CameraScreen onCapture={handleImage} />
        )}
        {screenState === ScreenStates.LOADING && <LoadingScreen />}
        {screenState === ScreenStates.RESULTS && (
          <ResultsScreen
            image={image}
            boundingBoxes={boundingBoxes}
            onReset={handleReset}
          />
        )}
      </SafeAreaView>
    </ApplicationProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
