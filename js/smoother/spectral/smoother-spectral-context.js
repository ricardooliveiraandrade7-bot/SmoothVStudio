// ==========================================
// SMOOTHVSTUDIO
// SMOOTHER SPECTRAL CONTEXT
// V1.0
// ==========================================
//
// Responsabilidade:
//
// Encaminhar a criação do contexto espectral
// para o SpectralTreatmentBridge.
//
// Este módulo NÃO altera:
// - análise;
// - diagnóstico;
// - planejamento;
// - decisões;
// - parâmetros DSP;
// - processamento de áudio.
//
// ==========================================

class SmootherSpectralContext {
  
  create(
    spectralTreatmentBridge,
    spectralProfile,
    spectralDiagnostic = null
  ) {
    
    if (
      !spectralProfile ||
      !spectralTreatmentBridge ||
      typeof spectralTreatmentBridge.createPlanningContext !==
      "function"
    ) {
      return null;
    }
    
    try {
      
      return spectralTreatmentBridge.createPlanningContext(
        spectralProfile,
        spectralDiagnostic
      );
      
    } catch (
      error
    ) {
      
      console.warn(
        "Spectral context indisponível nesta etapa:",
        error
      );
      
      return null;
    }
  }
}


// ==========================================
// DISPONIBILIZAR GLOBALMENTE
// ==========================================

if (
  typeof window !==
  "undefined"
) {
  
  window.SmootherSpectralContext =
    SmootherSpectralContext;
}