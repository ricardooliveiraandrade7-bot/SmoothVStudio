// ==========================================
// SMOOTHVSTUDIO
// DECISION PRESERVATION
// V0.1
// ==========================================
//
// Responsabilidade:
//
// Identificar se um Treatment Decision Record
// solicita preservação.
//
// Este módulo NÃO:
// - altera decisões;
// - executa DSP;
// - altera AudioBuffer;
// - cria tratamento;
// - aplica preservação.
//
// ==========================================


class TreatmentDecisionPreservation {


    // ======================================
    // IDENTIFICAR PRESERVAÇÃO
    // ======================================

    static isPreserveRecord(
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


        const safeString =
            typeof helpers.safeString ===
            "function"
                ? helpers.safeString
                : (
                    input,
                    fallback = ""
                ) => {

                    if (
                        typeof input !==
                        "string"
                    ) {

                        return fallback;
                    }

                    return input.trim();
                };


        if (
            !isObject(
                record
            )
        ) {

            return true;
        }


        const decision =
            isObject(
                record.decision
            )
                ? record.decision
                : {};


        const actions = [

            record.action,

            record.decisionAction,

            record.recommendation,

            decision.action,

            decision.recommendation
        ];


        for (
            let i = 0;
            i < actions.length;
            i++
        ) {

            const action =
                safeString(
                    actions[i],
                    ""
                )
                    .toLowerCase();


            if (
                action ===
                    "preserve" ||
                action ===
                    "preservar"
            ) {

                return true;
            }
        }


        return false;
    }
}


// ==========================================
// EXPOSIÇÃO GLOBAL
// ==========================================

if (
    typeof window !==
    "undefined"
) {

    window.TreatmentDecisionPreservation =
        TreatmentDecisionPreservation;
}