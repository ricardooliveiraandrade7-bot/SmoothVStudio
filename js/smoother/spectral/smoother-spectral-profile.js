// ==========================================
// SMOOTHVSTUDIO
// SMOOTHER SPECTRAL PROFILE
// V1.0
// ==========================================
//
// Responsabilidade:
//
// Coordenar a execução do SpectralProfile
// utilizado pelo VocalSmoother.
//
// Este módulo NÃO:
//
// - altera a análise;
// - altera cálculos;
// - altera thresholds;
// - altera parâmetros;
// - altera classificação espectral;
// - processa AudioBuffer;
// - cria filtros.
//
// O SpectralProfile continua sendo responsável
// pela interpretação dos dados espectrais.
//
// Este módulo apenas:
//
// 1. recebe a análise;
// 2. verifica a disponibilidade do SpectralProfile;
// 3. executa analyze();
// 4. devolve exatamente o resultado;
// 5. preserva o tratamento de erro existente.
//
// ==========================================


class SmootherSpectralProfile {
  
  
  // ======================================
  // EXECUTAR PERFIL
  // ======================================
  
  analyze(
    spectralProfile,
    analysis
  ) {
    
    if (
      !analysis ||
      !spectralProfile ||
      typeof spectralProfile.analyze !==
      "function"
    ) {
      
      return null;
    }
    
    
    try {
      
      const profile =
        spectralProfile.analyze(
          analysis
        );
      
      
      return profile || null;
      
    } catch (
      error
    ) {
      
      console.warn(
        "SpectralProfile indisponível nesta etapa:",
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
  
  window.SmootherSpectralProfile =
    SmootherSpectralProfile;
}