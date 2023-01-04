import {
  media,
  MobileModel,
  torch,
  torchvision,
} from 'react-native-pytorch-core';

//import COCO_CLASSES from './CocoClasses.json';
import RECIPIC_CLASSES from './RecipicClasses.json';

//const MODEL_URL =
  //'https://github.com/raedle/test-some/releases/download/v0.0.2.0/yolov5s.torchscript_mr.ptl';

const MODEL_URL = require('./model/recipic7.torchscript.ptl');


let model = null;
const IMAGE_SIZE = 640;

/**
 * Computes intersection-over-union overlap between two bounding boxes.
 */
function IOU(a, b) {
  let areaA = (a[2] - a[0]) * (a[3] - a[1]);
  if (areaA <= 0.0) return 0.0;

  let areaB = (b[2] - b[0]) * (b[3] - b[1]);
  if (areaB <= 0.0) return 0.0;

  const intersectionMinX = Math.max(a[0], b[0]);
  const intersectionMinY = Math.max(a[1], b[1]);
  const intersectionMaxX = Math.min(a[2], b[2]);
  const intersectionMaxY = Math.min(a[3], b[3]);
  const intersectionArea =
    Math.max(intersectionMaxY - intersectionMinY, 0) *
    Math.max(intersectionMaxX - intersectionMinX, 0);
  return intersectionArea / (areaA + areaB - intersectionArea);
}

function nonMaxSuppression(boxes, limit, threshold) {
  // Do an argsort on the confidence scores, from high to low.
  const newBoxes = boxes.sort((a, b) => {
    return a.score - b.score;
  });

  const selected = [];
  const active = new Array(newBoxes.length).fill(true);
  let numActive = active.length;

  // The algorithm is simple: Start with the box that has the highest score.
  // Remove any remaining boxes that overlap it more than the given threshold
  // amount. If there are any boxes left (i.e. these did not overlap with any
  // previous boxes), then repeat this procedure, until no more boxes remain
  // or the limit has been reached.
  let done = false;
  for (let i = 0; i < newBoxes.length && !done; i++) {
    if (active[i]) {
      const boxA = newBoxes[i];
      selected.push(boxA);
      if (selected.length >= limit) break;

      for (let j = i + 1; j < newBoxes.length; j++) {
        if (active[j]) {
          const boxB = newBoxes[j];
          if (IOU(boxA.bounds, boxB.bounds) > threshold) {
            active[j] = false;
            numActive -= 1;
            if (numActive <= 0) {
              done = true;
              break;
            }
          }
        }
      }
    }
  }
  return selected;
}

function outputsToNMSPredictions(
  prediction,
  imgScaleX,
  imgScaleY,
  startX,
  startY,
) {
  const threshold = 0.3;
  const limit = 15;
  const results = [];
  const rows = prediction.shape[0];
  const nc = prediction.shape[1] - 5;
  for (let i = 0; i < rows; i++) {
    const outputs = prediction[i].data();
    if (outputs[4] > threshold) {
      const x = outputs[0];
      const y = outputs[1];
      const w = outputs[2];
      const h = outputs[3];

      const left = imgScaleX * (x - w / 2);
      const top = imgScaleY * (y - h / 2);

      let max = outputs[5];
      let cls = 0;
      for (let j = 0; j < nc; j++) {
        if (outputs[j + 5] > max) {
          max = outputs[j + 5];
          cls = j;
        }
      }

      const bound = [
        startX + left,
        startY + top,
        w * imgScaleX,
        h * imgScaleY,
      ];
      const result = {
        classIndex: cls,
        score: outputs[4],
        bounds: bound,
      };
      results.push(result);
    }
  }
  return nonMaxSuppression(results, limit, threshold);
}

export default async function detectObjects(image) {
  // Start packing
  const startPackTime = global.performance.now();
  
  // Get image width and height
  const height = image.getHeight();
  const width = image.getWidth();

  // Convert image to blob, which is a byte representation of the image
  // in the format height (H), width (W), and channels (C), or HWC for short
  const blob = media.toBlob(image);

  // Get a tensor from image the blob and also define in what format
  // the image blob is.
  let tensor = torch.fromBlob(blob, [height, width, 3]);

  // Rearrange the tensor shape to be [CHW]
  tensor = tensor.permute([2, 0, 1]);

  // Divide the tensor values by 255 to get values between [0, 1]
  tensor = tensor.div(255);

  // Resize the image tensor to 3 x min(height, IMAGE_SIZE) x min(width, IMAGE_SIZE)
  const resize = torchvision.transforms.resize([IMAGE_SIZE, IMAGE_SIZE]);
  tensor = resize(tensor);

  // Center crop the image to IMAGE_SIZE x IMAGE_SIZE
  const centerCrop = torchvision.transforms.centerCrop([IMAGE_SIZE]);
  tensor = centerCrop(tensor);

  // Unsqueeze adds 1 leading dimension to the tensor
  tensor = tensor.unsqueeze(0);
  
  const packTime = global.performance.now() - startPackTime;

  // Load model if not loaded
  if (model === null) {
    console.log('Loading model...');
    const filePath = await MobileModel.download(MODEL_URL);
    model = await torch.jit._loadForMobile(filePath);
    console.log('Model successfully loaded');
  }

  try {
    // Run inference
    const startInferencTime = global.performance.now();
    const output = await model.forward(tensor);
    const inferenceTime = global.performance.now() - startInferencTime;

    // Start unpacking
    const startUnpackTime = global.performance.now();

    const prediction = output[0];

    const imageWidth = image.getWidth();
    const imageHeight = image.getHeight();
    const imgScaleX = imageWidth / IMAGE_SIZE;
    const imgScaleY = imageHeight / IMAGE_SIZE;

    // Filter results and calulate bounds
    const results = outputsToNMSPredictions(
      prediction[0],
      imgScaleX,
      imgScaleY,
      0,
      0,
    );

    // Format filtered results with object name and bounds
    const resultBoxes = [];
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const nameIdx = result.classIndex;
      const name = RECIPIC_CLASSES[nameIdx];

      const match = {
        objectClass: name,
        bounds: result.bounds,
      };

      resultBoxes.push(match);
    }
    const unpackTime = global.performance.now() - startUnpackTime;

    console.log(`pack time ${packTime.toFixed(3)} ms`);
    console.log(`inference time ${inferenceTime.toFixed(3)} ms`);
    console.log(`unpack time ${unpackTime.toFixed(3)} ms`);
    return resultBoxes;
  } catch (error) {
    console.log(error);
  }
}
