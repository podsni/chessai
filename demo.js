// Demo script untuk menguji Stockfish API
import { Chess } from "chess.js";

const STOCKFISH_API_URL = "https://stockfish.online/api/s/v2.php";

async function testStockfishAPI() {
  console.log("🎯 Testing Chess Bot dengan Stockfish API...\n");

  // Inisialisasi chess
  const chess = new Chess();

  console.log("📋 Initial Position:");
  console.log(chess.ascii());
  console.log(`FEN: ${chess.fen()}\n`);

  try {
    // Test API call
    console.log("🔍 Calling Stockfish API...");
    const fen = chess.fen();
    const depth = 10;
    const url = `${STOCKFISH_API_URL}?fen=${encodeURIComponent(fen)}&depth=${depth}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.success) {
      console.log("✅ API Response successful!");
      console.log(`📊 Evaluation: ${data.evaluation || "N/A"}`);
      console.log(`🎯 Best Move: ${data.bestmove || "N/A"}`);
      console.log(`♟️  Continuation: ${data.continuation || "N/A"}`);

      // Parse best move
      if (data.bestmove) {
        const moveMatch = data.bestmove.match(
          /bestmove\s+([a-h][1-8][a-h][1-8])([qrbn])?/,
        );
        if (moveMatch) {
          const moveStr = moveMatch[1];
          const promotion = moveMatch[2];
          const parsedMove = {
            from: moveStr.slice(0, 2),
            to: moveStr.slice(2, 4),
            promotion: promotion || undefined,
          };

          console.log(`🔄 Parsed Move: ${parsedMove.from} -> ${parsedMove.to}`);

          // Make the move
          const result = chess.move(parsedMove);
          if (result) {
            console.log(`✅ Move applied: ${result.san}`);
            console.log("\n📋 Position after move:");
            console.log(chess.ascii());
          }
        }
      }
    } else {
      console.log("❌ API call failed");
    }
  } catch (error) {
    console.error("💥 Error:", error.message);
  }
}

async function testGamePlay() {
  console.log("\n🎮 Testing Game Play Scenario...\n");

  const chess = new Chess();
  const moves = ["e4", "e5", "Nf3", "Nc6"];

  for (const move of moves) {
    const result = chess.move(move);
    console.log(`👤 Move: ${move} -> ${result.san}`);

    // Get position analysis
    try {
      const fen = chess.fen();
      const url = `${STOCKFISH_API_URL}?fen=${encodeURIComponent(fen)}&depth=8`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        const evaluation =
          data.evaluation !== null ? data.evaluation.toFixed(2) : "N/A";
        console.log(
          `📊 Evaluation: ${evaluation}, Best: ${data.bestmove || "N/A"}`,
        );
      }
    } catch (error) {
      console.log(`❌ Analysis failed: ${error.message}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 1000)); // Rate limiting
  }

  console.log("\n📋 Final Position:");
  console.log(chess.ascii());
}

// Run tests
testStockfishAPI()
  .then(() => testGamePlay())
  .then(() => {
    console.log("\n🎉 All tests completed!");
    console.log("🚀 Your Chess Bot is ready to use!");
    console.log("💡 Run: bun run dev");
  })
  .catch(console.error);
