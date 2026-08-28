// ==========================================
// SMOOTHVSTUDIO
// SMOOTHER DSP SNAPSHOT
// V1.0
// ==========================================
//
// Responsabilidade:
//
// Criar uma cópia das últimas configurações
// DSP produzidas pelo VocalSmoother.
//
// Este módulo NÃO:
//
// - processa áudio;
// - cria filtros;
// - altera parâmetros DSP;
// - executa tratamento;
// - modifica configurações.
//
// Ele apenas organiza os dados existentes
// em um snapshot.
//
// ==========================================


class SmootherDspSnapshot {


    constructor(
        options = {}
    ) {

        this.version =
            options.version ||
            "1.2";
    }


    // ======================================
    // CRIAR SNAPSHOT
    // ======================================

    create(
        settings
    ) {

        const copySettings =
            value => {

                if (
                    !value ||
                    typeof value !==
                    "object"
                ) {

                    return null;
                }


                return {
                    ...value
                };
            };


        settings =
            settings || {};


        return {

            version:
                this.version,

            body:
                copySettings(
                    settings.body
                ),

            tone:
                copySettings(
                    settings.tone
                ),

            dynamics:
                copySettings(
                    settings.dynamics
                ),

            harshness:
                copySettings(
                    settings.harshness
                ),

            saturation:
                copySettings(
                    settings.saturation
                ),

            sibilance:
                copySettings(
                    settings.sibilance
                ),

            processingPermission:
                "none",

            audioProcessing:
                false,

            reconstructionPermission:
                "none",

            executorPermission:
                "none"
        };
    }
}


// ==========================================
// DISPONIBILIZAR GLOBALMENTE
// ==========================================

if (
    typeof window !==
    "undefined"
) {

    window.SmootherDspSnapshot =
        SmootherDspSnapshot;
}