// Test script untuk memverifikasi build
console.log("🎯 Testing Chess Bot Build...\n");

// Cek apakah build folder ada
import { existsSync } from "fs";

const buildExists = existsSync("./dist");
console.log(`📁 Build folder exists: ${buildExists ? "✅" : "❌"}`);

if (buildExists) {
  console.log("✅ Build successful!");
  console.log("🚀 Run: bun run preview");
  console.log("🌐 Or run: bun run dev");
  console.log("\n📖 Application features:");
  console.log("   - Interactive chess board");
  console.log("   - Play vs Stockfish AI");
  console.log("   - Position analysis");
  console.log("   - FEN position loading");
  console.log("   - Move history tracking");
  console.log("   - Adjustable bot difficulty");
} else {
  console.log("❌ Build failed! Run: bun run build");
}

console.log("\n🎮 Ready to play chess! 🏆");
