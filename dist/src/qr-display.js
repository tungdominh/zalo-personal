import * as fs from "fs";
import qrcode from "qrcode-terminal";
import { PNG } from "pngjs";
import jsQR from "jsqr";
/**
 * Read QR code content from PNG image
 */
async function readQRFromPNG(pngPath) {
    return new Promise((resolve, reject) => {
        try {
            // Read PNG file
            const buffer = fs.readFileSync(pngPath);
            const png = PNG.sync.read(buffer);
            // Decode QR code using jsQR
            const code = jsQR(Uint8ClampedArray.from(png.data), png.width, png.height);
            if (!code) {
                reject(new Error("Could not decode QR code from image"));
                return;
            }
            resolve(code.data);
        }
        catch (err) {
            reject(new Error(`Failed to read QR code: ${err instanceof Error ? err.message : String(err)}`));
        }
    });
}
/**
 * Display QR: read QR content from PNG, then display in terminal
 * Returns the path to the QR PNG file
 */
export async function displayQRFromPNG(base64Image) {
    const pngPath = "/tmp/openclaw-zalo-personal-qr.png";
    try {
        // Save PNG file
        const buffer = Buffer.from(base64Image, "base64");
        fs.writeFileSync(pngPath, buffer);
        // Read QR code content from PNG
        const qrContent = await readQRFromPNG(pngPath);
        // Display QR content using qrcode-terminal
        console.log("\n");
        qrcode.generate(qrContent, { small: true });
        console.log("\nScan the QR code above with your Zalo app to login");
        console.log(`\nQR image saved at: ${pngPath}\n`);
        // Return the path so it can be deleted after successful login
        return pngPath;
    }
    catch (err) {
        throw new Error(`Failed to display QR: ${err instanceof Error ? err.message : String(err)}`);
    }
}
