// ==========================================
// SMOOTHVSTUDIO
// WAV EXPORTER
// V0.1
// ==========================================

class WavExporter {
  
  
  // ======================================
  // CRIAR BLOB WAV
  // ======================================
  
  static createBlob(audioBuffer) {
    
    if (!audioBuffer) {
      
      throw new Error(
        "Nenhum áudio processado."
      );
    }
    
    
    return AudioEngine.bufferToWav(
      audioBuffer
    );
  }
  
  
  // ======================================
  // CRIAR OBJETO FILE
  // ======================================
  
  static createFile(
    audioBuffer,
    fileName =
    "smoothvstudio-vocal.wav"
  ) {
    
    const blob =
      WavExporter.createBlob(
        audioBuffer
      );
    
    
    return new File(
      [blob],
      fileName,
      {
        type: "audio/wav"
      }
    );
  }
  
}