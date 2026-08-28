// ==========================================
// SMOOTHVSTUDIO
// DECISION GAIN
// V0.1
// ==========================================
//
// Responsabilidade:
//
// Extrair o ganho solicitado de um
// Treatment Decision Record.
//
// Este módulo NÃO:
// - altera decisões;
// - executa DSP;
// - altera AudioBuffer;
// - modifica o ganho;
// - aplica qualquer tratamento.
//
// ==========================================


class TreatmentDecisionGain {


    // ======================================
    // EXTRAIR GANHO SOLICITADO
    // ======================================

    static extractRequestedGainDb(
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


        const isFiniteNumber =
            typeof helpers.isFiniteNumber ===
            "function"
                ? helpers.isFiniteNumber
                : (
                    input
                ) => {

                    return (
                        typeof input ===
                            "number" &&
                        Number.isFinite(
                            input
                        )
                    );
                };


        if (
            !isObject(
                record
            )
        ) {

            return 0;
        }


        const decision =
            isObject(
                record.decision
            )
                ? record.decision
                : {};


        const candidates = [

            record.requestedGainDb,

            record.gainDb,

            record.recommendedGainDb,

            record.amountDb,

            decision.requestedGainDb,

            decision.gainDb,

            decision.recommendedGainDb,

            decision.amountDb
        ];


        for (
            let i = 0;
            i < candidates.length;
            i++
        ) {

            if (
                isFiniteNumber(
                    candidates[i]
                )
            ) {

                return candidates[i];
            }
        }


        return 0;
    }
}


// ==========================================
// EXPOSIÇÃO GLOBAL
// ==========================================

if (
    typeof window !==
    "undefined"
) {

    window.TreatmentDecisionGain =
        TreatmentDecisionGain;
}