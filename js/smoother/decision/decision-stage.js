// ==========================================
// SMOOTHVSTUDIO
// DECISION STAGE
// V0.1
// ==========================================
//
// Responsabilidade:
//
// Criar a estrutura padrão de uma etapa
// do Treatment Decision Pipeline.
//
// Este módulo NÃO:
// - executa decisões;
// - valida tratamentos;
// - executa DSP;
// - altera AudioBuffer;
// - processa áudio.
//
// ==========================================


class TreatmentDecisionStage {


    // ======================================
    // CRIAR RESULTADO DE ETAPA
    // ======================================

    static createStage(
        name
    ) {

        return {

            name,

            executed:
                false,

            valid:
                false,

            available:
                false,

            errors:
                [],

            warnings:
                []
        };
    }
}


// ==========================================
// EXPOSIÇÃO GLOBAL
// ==========================================

if (
    typeof window !==
    "undefined"
) {

    window.TreatmentDecisionStage =
        TreatmentDecisionStage;
}