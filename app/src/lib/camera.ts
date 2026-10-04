/**
 * Take or pick a photo as a small JPEG (about 900px wide by default).
 *
 * On a phone the photo is saved as a file in the app's own storage and its file URI is
 * returned, so the app's data (one stored item, size-limited on Android) only holds the
 * location of the picture. In the browser it is returned as a data URL instead.
 * The real backend will upload these files.
 */
import { Directory, File, Paths } from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

export type PhotoSource = 'camera' | 'library';

/** The folder holding visit and document photos inside the app's storage. */
function photoDir(): Directory {
  const dir = new Directory(Paths.document, 'photos');
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

export async function takePhoto(source: PhotoSource = 'camera', width = 900): Promise<string | null> {
  const web = Platform.OS === 'web';
  const useCamera = source === 'camera' && !web;
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
  if (web) {
    const out = await img.saveAsync({ format: ImageManipulator.SaveFormat.JPEG, compress: 0.55, base64: true });
    return out.base64 ? 'data:image/jpeg;base64,' + out.base64 : out.uri;
  }
  // Phone: move the compressed picture out of the temporary cache into the app's storage.
  const out = await img.saveAsync({ format: ImageManipulator.SaveFormat.JPEG, compress: 0.55 });
  const dest = new File(photoDir(), 'ph_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7) + '.jpg');
  new File(out.uri).moveSync(dest);
  return dest.uri;
}
