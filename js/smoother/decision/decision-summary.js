// ==========================================
// SMOOTHVSTUDIO
// DECISION SUMMARY
// V0.1
// ==========================================
//
// Responsabilidade:
//
// Resumir os Decision Records já produzidos.
//
// Este módulo NÃO:
// - cria decisões;
// - altera decisões;
// - valida tratamentos;
// - altera autoridade;
// - executa DSP;
// - processa áudio.
//
// ==========================================


class TreatmentDecisionSummary {


    // ======================================
    // RESUMIR DECISION RECORDS
    // ======================================

    static summarizeRecords(
        result,
        helpers = {}
    ) {

        const isArray =
            typeof helpers.isArray ===
            "function"
                ? helpers.isArray
                : Array.isArray;


        if (
            !isArray(
                result
            )
        ) {

            return {

                total:
                    0,

                preserved:
                    0,

                decisions:
                    0
            };
        }


        let preserved =
            0;

        let decisions =
            0;


        result.forEach(
            record => {

                if (
                    record &&
                    record.action ===
                    "preserve"
                ) {

                    preserved++;
                }


                if (
                    record &&
                    record.action ===
                    "decision"
                ) {

                    decisions++;
                }
            }
        );


        return {

            total:
                result.length,

            preserved,

            decisions
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

    window.TreatmentDecisionSummary =
        TreatmentDecisionSummary;
}