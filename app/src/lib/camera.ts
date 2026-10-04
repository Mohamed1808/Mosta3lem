/**
 * Take or pick a photo and return it as a small JPEG data URL (about 900px wide), so
 * evidence stays light on the device until it is uploaded to the real backend.
 */
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

export type PhotoSource = 'camera' | 'library';

export async function takePhoto(source: PhotoSource = 'camera', width = 900): Promise<string | null> {
  const useCamera = source === 'camera' && Platform.OS !== 'web';
  if (useCamera) {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return null;
  }
  const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7 };
  const res = useCamera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
  if (res.canceled || !res.assets || !res.assets[0]) return null;
  const asset = res.assets[0];
  const ctx = ImageManipulator.ImageManipulator.manipulate(asset.uri);
  if (asset.width && asset.width > width) ctx.resize({ width, height: null });
  const img = await ctx.renderAsync();
  const out = await img.saveAsync({ format: ImageManipulator.SaveFormat.JPEG, compress: 0.55, base64: true });
  return out.base64 ? 'data:image/jpeg;base64,' + out.base64 : out.uri;
}
