// ==========================================
// SMOOTHVSTUDIO
// SMOOTHER TREATMENT DECISION
// V1.0
// ==========================================
//
// Responsabilidade:
//
// Encaminhar a avaliação do Treatment
// Decision Pipeline.
//
// Este módulo NÃO altera:
//
// - decisões;
// - regras;
// - thresholds;
// - evidências;
// - ganhos;
// - preservação;
// - autoridade;
// - processamento DSP.
//
// O TreatmentDecisionPipeline continua sendo
// o responsável por toda a lógica de decisão.
//
// ==========================================

class SmootherTreatmentDecision {
  
  evaluate(
    treatmentDecisionPipeline,
    treatmentPlan
  ) {
    
    if (
      !treatmentDecisionPipeline ||
      !treatmentPlan
    ) {
      
      return null;
    }
    
    
    if (
      typeof treatmentDecisionPipeline.evaluate !==
      "function"
    ) {
      
      console.warn(
        "TreatmentDecisionPipeline não possui evaluate()."
      );
      
      
      return null;
    }
    
    
    try {
      
      return treatmentDecisionPipeline.evaluate(
        treatmentPlan
      );
      
    } catch (
      error
    ) {
      
      console.warn(
        "TreatmentDecisionPipeline indisponível nesta etapa:",
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
  
  window.SmootherTreatmentDecision =
    SmootherTreatmentDecision;
}