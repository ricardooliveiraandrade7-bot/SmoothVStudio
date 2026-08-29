// ==========================================
// SMOOTHVSTUDIO
// SMOOTHER SPECTRAL DIAGNOSTIC
// V1.0
// ==========================================
//
// Responsabilidade:
//
// Encaminhar a execução do diagnóstico
// espectral para o SpectralDiagnosticObserver.
//
// Este módulo NÃO altera:
//
// - análise;
// - medição regional;
// - diagnóstico;
// - thresholds;
// - parâmetros;
// - decisões;
// - processamento DSP.
//
// O estado lastSpectralRegionalMeasurement
// continua pertencendo ao VocalSmoother.
//
// ==========================================

class SmootherSpectralDiagnostic {
  
  observe(
    spectralDiagnosticObserver,
    spectralContext,
    spectralRegionalMeasurement
  ) {
    
    if (
      !spectralContext ||
      !spectralDiagnosticObserver ||
      typeof spectralDiagnosticObserver.observe !==
      "function"
    ) {
      return null;
    }
    
    try {
      
      return spectralDiagnosticObserver.observe(
        spectralContext,
        spectralRegionalMeasurement
      );
      
    } catch (
      error
    ) {
      
      console.warn(
        "Spectral diagnostic indisponível nesta etapa:",
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
  
  window.SmootherSpectralDiagnostic =
    SmootherSpectralDiagnostic;
}