// ==========================================
// SMOOTHVSTUDIO
// DECISION REGION
// V0.1
// ==========================================
//
// Responsabilidade:
//
// Normalizar uma região utilizada pelo
// Treatment Decision Pipeline.
//
// Este módulo NÃO:
// - altera decisões;
// - altera autoridade;
// - executa DSP;
// - altera AudioBuffer;
// - cria tratamento.
//
// ==========================================

class TreatmentDecisionRegion {


    // ======================================
    // NORMALIZAR REGIÃO
    // ======================================

    static normalizeRegion(
        value,
        helpers = {}
    ) {

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


        if (
            typeof value ===
            "string"
        ) {

            const name =
                safeString(
                    value
                );


            if (
                !name
            ) {

                return null;
            }


            return {

                id:
                    name,

                name:
                    name
            };
        }


        if (
            isObject(
                value
            )
        ) {

            const id =
                safeString(
                    value.id ||
                    value.key ||
                    value.name,
                    "unknown"
                );


            const name =
                safeString(
                    value.name ||
                    value.label ||
                    id,
                    id
                );


            return {

                id,

                name
            };
        }


        return null;
    }
}


// ==========================================
// EXPOSIÇÃO GLOBAL
// ==========================================

if (
    typeof window !==
    "undefined"
) {

    window.TreatmentDecisionRegion =
        TreatmentDecisionRegion;
}