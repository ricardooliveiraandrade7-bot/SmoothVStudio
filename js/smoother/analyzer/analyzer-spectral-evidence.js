// ==========================================
// SMOOTHVSTUDIO
// ANALYZER SPECTRAL EVIDENCE
// ==========================================

class AnalyzerSpectralEvidence {
  
  static calculateSpectralEvidence(
    analyzer,
    bands,
    spectralTimeline
  ) {
    
    const body =
      bands.body || 0;
    
    const lowMid =
      bands.lowMid || 0;
    
    const mid =
      bands.mid || 0;
    
    const presence =
      bands.presence || 0;
    
    const sibilance =
      bands.sibilance || 0;
    
    const air =
      bands.air || 0;
    
    
    const lowerCore =
      body +
      lowMid +
      mid +
      presence +
      0.000001;
    
    
    const upperCore =
      sibilance +
      air +
      0.000001;
    
    
    const upperRatio =
      upperCore /
      (
        lowerCore +
        upperCore
      );
    
    
    const upperPresence =
      spectralTimeline &&
      Number.isFinite(
        spectralTimeline.upperPresence
      ) ?
      spectralTimeline.upperPresence :
      analyzer.clamp(
        upperRatio * 8,
        0,
        1
      );
    
    
    const upperStability =
      spectralTimeline &&
      Number.isFinite(
        spectralTimeline.stability
      ) ?
      spectralTimeline.stability :
      0;
    
    
    const bandwidthConfidence =
      spectralTimeline &&
      Number.isFinite(
        spectralTimeline.confidence
      ) ?
      spectralTimeline.confidence :
      0;
    
    
    const bandwidthDeficiency =
      Boolean(
        spectralTimeline &&
        spectralTimeline.bandwidthDeficiency
      );
    
    
    const upperToLowerRatio =
      spectralTimeline &&
      Number.isFinite(
        spectralTimeline.upperToLowerRatio
      ) ?
      spectralTimeline.upperToLowerRatio :
      upperCore /
      (
        lowerCore +
        0.000001
      );
    
    
    const upperAvailabilityScore =
      analyzer.clamp(
        (
          upperPresence *
          0.55
        ) +
        (
          upperStability *
          0.20
        ) +
        (
          bandwidthConfidence *
          0.25
        ),
        0,
        1
      );
    
    
    let status =
      "preserve";
    
    
    let reason =
      "insufficient-band-evidence";
    
    
    if (
      bandwidthDeficiency
    ) {
      
      status =
        "possible-deficiency";
      
      reason =
        "persistent-upper-content-deficit";
      
    } else if (
      upperAvailabilityScore >=
      0.55 &&
      bandwidthConfidence >=
      analyzer.minimumSpectralConfidence
    ) {
      
      status =
        "available";
      
      reason =
        "upper-content-supported";
      
    } else if (
      bandwidthConfidence >=
      analyzer.minimumSpectralConfidence
    ) {
      
      status =
        "neutral";
      
      reason =
        "upper-content-not-conclusive";
    }
    
    
    return {
      
      upperRatio,
      
      upperPresence,
      
      upperStability,
      
      upperToLowerRatio,
      
      upperAvailabilityScore,
      
      bandwidthConfidence,
      
      bandwidthDeficiency,
      
      status,
      
      reason
    };
  }
}


// ==========================================
// DISPONIBILIZAR GLOBALMENTE
// ==========================================

window.AnalyzerSpectralEvidence =
  AnalyzerSpectralEvidence;