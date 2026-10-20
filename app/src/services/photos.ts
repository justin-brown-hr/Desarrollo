import { randomUUID } from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

const photosDir = () => {
  const dir = new Directory(Paths.document, 'photos');
  dir.create({ intermediates: true, idempotent: true });
  return dir;
};

/** Resizes to 1280px and stores the JPEG in the app's documents so it survives until the report is sent. */
async function store(uri: string): Promise<string> {
  const image = await ImageManipulator.manipulate(uri).resize({ width: 1280, height: null }).renderAsync();
  const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.6 });
  const dest = new File(photosDir(), `${randomUUID()}.jpg`);
  new File(result.uri).copy(dest);
  return dest.uri;
}

export async function takePhoto(fromCamera: boolean): Promise<string | null> {
  if (fromCamera) {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) throw new Error('Permiso de cámara denegado');
  }
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.8 };
  const result = fromCamera
    ? await ImagePicker.launchCameraAsync(options)
    : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets?.length) return null;
  return store(result.assets[0].uri);
}

export function deletePhoto(uri: string) {
  try {
    new File(uri).delete();
  } catch {
    // Already gone; nothing to do.
  }
}
