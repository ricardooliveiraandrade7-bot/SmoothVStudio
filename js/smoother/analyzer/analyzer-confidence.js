// ==========================================
// SMOOTHVSTUDIO
// ANALYZER CONFIDENCE
// ==========================================
//
// Calcula a confiança global da análise.
//
// Este módulo NÃO altera o áudio.
//
// ==========================================


class AnalyzerConfidence {
  
  
  // ======================================
  // CALCULAR CONFIANÇA GLOBAL V0.8
  // ======================================
  
  static calculateAnalysisConfidence(
    analyzer,
    sibilanceTimeline,
    roughnessTimeline,
    noiseProfile,
    spectralTimeline
  ) {
    
    const sibilanceConfidence =
      sibilanceTimeline &&
      Number.isFinite(
        sibilanceTimeline.temporalScore
      ) ?
      analyzer.clamp(
        sibilanceTimeline.temporalScore,
        0,
        1
      ) :
      0;
    
    
    const roughnessConfidence =
      roughnessTimeline &&
      Number.isFinite(
        roughnessTimeline.confidence
      ) ?
      analyzer.clamp(
        roughnessTimeline.confidence,
        0,
        1
      ) :
      0;
    
    
    const noiseConfidence =
      noiseProfile &&
      Number.isFinite(
        noiseProfile.confidence
      ) ?
      analyzer.clamp(
        noiseProfile.confidence,
        0,
        1
      ) :
      0;
    
    
    const spectralConfidence =
      spectralTimeline &&
      Number.isFinite(
        spectralTimeline.confidence
      ) ?
      analyzer.clamp(
        spectralTimeline.confidence,
        0,
        1
      ) :
      0;
    
    
    const confidence =
      analyzer.clamp(
        (
          0.50
        ) +
        (
          sibilanceConfidence *
          0.12
        ) +
        (
          roughnessConfidence *
          0.18
        ) +
        (
          noiseConfidence *
          0.08
        ) +
        (
          spectralConfidence *
          0.12
        ),
        0,
        1
      );
    
    
    return confidence;
  }
}


// ==========================================
// DISPONIBILIZAR GLOBALMENTE
// ==========================================

window.AnalyzerConfidence =
  AnalyzerConfidence;