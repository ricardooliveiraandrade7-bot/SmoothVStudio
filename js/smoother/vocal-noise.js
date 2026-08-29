// ==========================================
// SMOOTHVSTUDIO
// VOCAL NOISE REDUCER
// V0.1
// ==========================================
//
// Primeiro módulo dedicado exclusivamente
// à redução conservadora de ruído.
//
// IMPORTANTE:
//
// Este módulo NÃO é integrado automaticamente
// à cadeia principal nesta primeira etapa.
//
// Objetivo:
//
// - receber um AudioBuffer;
// - receber um perfil de ruído;
// - calcular uma redução extremamente
//   conservadora;
// - preservar transientes vocais;
// - preservar S / CH / respirações;
// - evitar processamento acumulativo.
//
// Esta versão é deliberadamente limitada.
//
// Ela NÃO deve ser considerada ainda o
// removedor final de ruído do SmoothVStudio.
//
// ==========================================


class VocalNoiseReducer {


    constructor(options = {}) {

        this.version =
            "0.1";


        // ==================================
        // CONFIGURAÇÃO DE SEGURANÇA
        // ==================================

        this.maxReductionDb =
            options.maxReductionDb ??
            3;


        this.minConfidence =
            options.minConfidence ??
            0.60;


        this.minNoiseRatio =
            options.minNoiseRatio ??
            0.025;


        this.protectionAmount =
            options.protectionAmount ??
            0.85;


        this.enabled =
            options.enabled ??
            true;
    }


    // ======================================
    // CLAMP
    // ======================================

    clamp(
        value,
        min,
        max
    ) {

        return Math.min(
            max,
            Math.max(
                min,
                value
            )
        );
    }


    // ======================================
    // DB → LINEAR
    // ======================================

    dbToLinear(
        db
    ) {

        return Math.pow(
            10,
            db / 20
        );
    }


    // ======================================
    // LINEAR → DB
    // ======================================

    linearToDb(
        value
    ) {

        if (
            value <= 0
        ) {

            return -120;
        }


        return 20 *
            Math.log10(
                value
            );
    }


    // ======================================
    // ANALISAR SE O PERFIL É CONFIÁVEL
    // ======================================

    isProfileUsable(
        noiseAnalysis
    ) {

        if (
            !noiseAnalysis
        ) {

            return false;
        }


        if (
            noiseAnalysis.available !==
            true
        ) {

            return false;
        }


        const confidence =
            Number(
                noiseAnalysis.confidence
            ) || 0;


        if (
            confidence <
            this.minConfidence
        ) {

            return false;
        }


        const floorRelative =
            Number(
                noiseAnalysis.floorRelative
            ) || 0;


        if (
            floorRelative <
            this.minNoiseRatio
        ) {

            return false;
        }


        return true;
    }


    // ======================================
    // CALCULAR REDUÇÃO SEGURA
    // ======================================

    calculateReduction(
        noiseAnalysis
    ) {

        if (
            !this.enabled
        ) {

            return {

                enabled:
                    false,

                reductionDb:
                    0,

                confidence:
                    0
            };
        }


        if (
            !this.isProfileUsable(
                noiseAnalysis
            )
        ) {

            return {

                enabled:
                    false,

                reductionDb:
                    0,

                confidence:
                    noiseAnalysis &&
                    Number(
                        noiseAnalysis.confidence
                    ) || 0
            };
        }


        const confidence =
            this.clamp(
                Number(
                    noiseAnalysis.confidence
                ) || 0,
                0,
                1
            );


        const floorRelative =
            this.clamp(
                Number(
                    noiseAnalysis.floorRelative
                ) || 0,
                0,
                1
            );


        /*
         * Quanto maior a confiança,
         * maior pode ser a ação.
         *
         * Porém mantemos um teto
         * extremamente baixo nesta primeira
         * versão.
         */


        const confidenceFactor =
            this.clamp(
                (
                    confidence -
                    this.minConfidence
                ) /
                (
                    1 -
                    this.minConfidence
                ),
                0,
                1
            );


        const noiseFactor =
            this.clamp(
                floorRelative /
                0.15,
                0,
                1
            );


        let reduction =
            this.maxReductionDb *
            confidenceFactor *
            noiseFactor;


        /*
         * Proteção contra excesso de redução.
         */

        reduction *=
            (
                1 -
                (
                    this.protectionAmount *
                    0.35
                )
            );


        reduction =
            this.clamp(
                reduction,
                0,
                this.maxReductionDb
            );


        return {

            enabled:
                reduction > 0,

            reductionDb:
                reduction,

            confidence,

            floorRelative,

            protection:
                this.protectionAmount
        };
    }


    // ======================================
    // CONFIGURAÇÃO
    // ======================================

    getSettings(
        noiseAnalysis
    ) {

        const reduction =
            this.calculateReduction(
                noiseAnalysis
            );


        return {

            version:
                this.version,

            enabled:
                reduction.enabled,

            reductionDb:
                reduction.reductionDb,

            confidence:
                reduction.confidence,

            floorRelative:
                reduction.floorRelative,

            protection:
                this.protectionAmount,

            maxReductionDb:
                this.maxReductionDb
        };
    }


    // ======================================
    // PROCESSAMENTO FUTURO
    // ======================================
    //
    // Esta função existe nesta versão
    // apenas como preparação arquitetural.
    //
    // Ela NÃO deve ser conectada ao
    // processamento principal ainda.
    //
    // ======================================

    process(
        audioBuffer,
        noiseAnalysis
    ) {

        if (
            !audioBuffer
        ) {

            throw new Error(
                "AudioBuffer inválido."
            );
        }


        const settings =
            this.getSettings(
                noiseAnalysis
            );


        /*
         * SEGURANÇA:
         *
         * Nesta V0.1 não alteramos
         * nenhum sample.
         *
         * O objetivo é validar a lógica
         * de decisão antes de permitir
         * qualquer alteração sonora.
         */


        return {

            buffer:
                audioBuffer,

            settings,

            changed:
                false
        };
    }
}


// ==========================================
// DISPONIBILIZAR GLOBALMENTE
// ==========================================

window.VocalNoiseReducer =
    VocalNoiseReducer;