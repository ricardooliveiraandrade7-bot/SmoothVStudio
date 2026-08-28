// ==========================================
// SMOOTHVSTUDIO
// DECISION EVIDENCE
// V0.1
// ==========================================
//
// Responsabilidade:
//
// Extrair a lista de evidências de um
// Treatment Decision Record.
//
// Este módulo NÃO:
// - altera decisões;
// - executa DSP;
// - altera AudioBuffer;
// - cria tratamento;
// - modifica as evidências.
//
// ==========================================


class TreatmentDecisionEvidence {


    // ======================================
    // EXTRAIR EVIDÊNCIAS
    // ======================================

    static extractEvidence(
        record,
        helpers = {}
    ) {

        const isObject =
            typeof helpers.isObject ===
            "function"
                ? helpers.isObject
                : (
                    input
                ) => {

                    return !!(
                        input &&
                        typeof input ===
                            "object"
                    );
                };


        const isArray =
            typeof helpers.isArray ===
            "function"
                ? helpers.isArray
                : (
                    input
                ) => {

                    return Array.isArray(
                        input
                    );
                };


        if (
            !isObject(
                record
            )
        ) {

            return [];
        }


        const sources = [

            record.evidence,

            record.evidenceList,

            record.supportingEvidence,

            record.observations,

            record.diagnostics,

            record.measurements,

            record.decision &&
            record.decision.evidence
        ];


        for (
            let i = 0;
            i < sources.length;
            i++
        ) {

            if (
                isArray(
                    sources[i]
                )
            ) {

                return [
                    ...sources[i]
                ];
            }
        }


        return [];
    }
}


// ==========================================
// EXPOSIÇÃO GLOBAL
// ==========================================

if (
    typeof window !==
    "undefined"
) {

    window.TreatmentDecisionEvidence =
        TreatmentDecisionEvidence;
}