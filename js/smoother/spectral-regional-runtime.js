// ==========================================
// SMOOTHVSTUDIO
// SPECTRAL REGIONAL RUNTIME
// V0.1
// ==========================================
//
// Camada de integração observacional entre:
//
// - VocalSmoother
// - VocalAnalyzer
// - SpectralRegionalMeasurement
//
// RESPONSABILIDADE:
//
// - receber uma análise já realizada;
// - executar a medição espectral regional;
// - manter o resultado separado do DSP;
// - fornecer o resultado para outras camadas;
// - nunca alterar o AudioBuffer;
// - nunca alterar parâmetros de processamento.
//
// IMPORTANTE:
//
// Este módulo NÃO:
//
// - aplica EQ;
// - aplica compressão;
// - aplica de-essing;
// - altera ganho;
// - altera timbre;
// - altera o plano DSP;
// - conecta AudioNodes;
// - executa processamento de áudio.
//
// Ele é exclusivamente uma camada de:
//
// ANALISAR → MEDIR → EXPOR
//
// ==========================================


class SpectralRegionalRuntime {


    constructor(
        options = {}
    ) {


        this.version =
            "0.1";


        // ==================================
        // MEDIDOR REGIONAL
        // ==================================

        this.measurement =
            options.measurement ||


            (
                window.SpectralRegionalMeasurement
                    ? new SpectralRegionalMeasurement()
                    : null
            );


        // ==================================
        // ESTADO
        // ==================================

        this.lastAnalysis =
            null;


        this.lastMeasurement =
            null;


        this.lastSummary =
            null;


        this.available =
            !!this.measurement;
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
    // NÚMERO SEGURO
    // ======================================

    safeNumber(
        value,
        fallback = 0
    ) {

        const number =
            Number(
                value
            );


        return Number.isFinite(
            number
        )
            ? number
            : fallback;
    }


    // ======================================
    // VERIFICAR DISPONIBILIDADE
    // ======================================

    isAvailable() {

        return (
            this.available === true &&
            !!this.measurement &&
            typeof this.measurement.analyze ===
                "function"
        );
    }


    // ======================================
    // EXECUTAR MEDIÇÃO
    // ======================================

    analyze(
        analysis
    ) {

        this.lastAnalysis =
            analysis || null;


        // ----------------------------------
        // MEDIDOR INDISPONÍVEL
        // ----------------------------------

        if (
            !this.isAvailable()
        ) {

            const unavailable = {

                version:
                    this.version,

                valid:
                    false,

                available:
                    false,

                confidence:
                    0,

                evidence:
                    "none",

                regions:
                    {},

                decisionPolicy: {

                    observationOnly:
                        true,

                    processingPermission:
                        "none"
                },

                reason:
                    "regional-measurement-unavailable"
            };


            this.lastMeasurement =
                unavailable;


            this.lastSummary =
                this.createSummary(
                    unavailable
                );


            return unavailable;
        }


        // ----------------------------------
        // ANÁLISE INVÁLIDA
        // ----------------------------------

        if (
            !analysis ||
            typeof analysis !==
                "object"
        ) {

            const invalid = {

                version:
                    this.version,

                valid:
                    false,

                available:
                    true,

                confidence:
                    0,

                evidence:
                    "none",

                regions:
                    {},

                decisionPolicy: {

                    observationOnly:
                        true,

                    processingPermission:
                        "none"
                },

                reason:
                    "analysis-unavailable"
            };


            this.lastMeasurement =
                invalid;


            this.lastSummary =
                this.createSummary(
                    invalid
                );


            return invalid;
        }


        // ----------------------------------
        // EXECUTAR MEDIÇÃO
        // ----------------------------------

        try {

            const result =
                this.measurement.analyze(
                    analysis
                );


            const safeResult =
                result &&
                typeof result ===
                    "object"

                    ? result

                    : {

                        version:
                            this.version,

                        valid:
                            false,

                        available:
                            true,

                        confidence:
                            0,

                        evidence:
                            "none",

                        regions:
                            {},

                        decisionPolicy: {

                            observationOnly:
                                true,

                            processingPermission:
                                "none"
                        },

                        reason:
                            "invalid-measurement-result"
                    };


            // --------------------------------
            // FORÇAR SEGURANÇA OBSERVACIONAL
            // --------------------------------
            //
            // Mesmo que outra camada forneça
            // propriedades adicionais, este
            // runtime não concede permissão
            // de processamento.
            //
            // --------------------------------

            safeResult.decisionPolicy = {

                observationOnly:
                    true,

                processingPermission:
                    "none",

                modifiesAudio:
                    false,

                modifiesDSP:
                    false,

                modifiesTreatmentParameters:
                    false
            };


            this.lastMeasurement =
                safeResult;


            this.lastSummary =
                this.createSummary(
                    safeResult
                );


            return safeResult;


        } catch (error) {


            console.warn(

                "SpectralRegionalRuntime: " +
                "medição regional indisponível.",

                error

            );


            const failure = {

                version:
                    this.version,

                valid:
                    false,

                available:
                    true,

                confidence:
                    0,

                evidence:
                    "none",

                regions:
                    {},

                decisionPolicy: {

                    observationOnly:
                        true,

                    processingPermission:
                        "none",

                    modifiesAudio:
                        false,

                    modifiesDSP:
                        false,

                    modifiesTreatmentParameters:
                        false
                },

                reason:
                    "regional-measurement-error"
            };


            this.lastMeasurement =
                failure;


            this.lastSummary =
                this.createSummary(
                    failure
                );


            return failure;
        }
    }


    // ======================================
    // RESUMO
    // ======================================

    createSummary(
        measurement
    ) {

        if (
            !measurement ||
            typeof measurement !==
                "object"
        ) {

            return {

                available:
                    false,

                valid:
                    false,

                confidence:
                    0,

                evidence:
                    "none",

                regionCount:
                    0,

                usableRegions:
                    0,

                supportedRegions:
                    0,

                processingPermission:
                    "none"
            };
        }


        return {

            available:
                measurement.available !==
                    false,

            valid:
                measurement.valid ===
                    true,

            version:
                measurement.version ||
                this.version,

            confidence:
                this.clamp(

                    this.safeNumber(
                        measurement.confidence
                    ),

                    0,

                    1

                ),

            evidence:
                measurement.evidence ||
                "none",

            regionCount:
                this.safeNumber(
                    measurement.regionCount
                ),

            usableRegions:
                this.safeNumber(
                    measurement.usableRegions
                ),

            supportedRegions:
                this.safeNumber(
                    measurement.supportedRegions
                ),

            regionalCenterHz:
                this.safeNumber(
                    measurement.regionalCenterHz
                ),

            temporalEvidence:
                this.clamp(

                    this.safeNumber(
                        measurement.temporalEvidence
                    ),

                    0,

                    1

                ),

            lowHighBalance:
                measurement.lowHighBalance ||
                null,

            processingPermission:
                "none"
        };
    }


    // ======================================
    // OBTER ÚLTIMA MEDIÇÃO
    // ======================================

    getLastMeasurement() {

        return this.lastMeasurement;
    }


    // ======================================
    // OBTER RESUMO
    // ======================================

    getLastSummary() {

        return this.lastSummary;
    }


    // ======================================
    // OBTER UMA REGIÃO
    // ======================================

    getRegion(
        name
    ) {

        if (
            !this.lastMeasurement ||
            !this.lastMeasurement.regions
        ) {

            return null;
        }


        if (
            typeof name !==
                "string"
        ) {

            return null;
        }


        return (

            this.lastMeasurement
                .regions[name] ||

            null

        );
    }


    // ======================================
    // VERIFICAR EVIDÊNCIA REGIONAL
    // ======================================

    hasRegionalEvidence(
        name
    ) {

        const region =
            this.getRegion(
                name
            );


        if (
            !region
        ) {

            return false;
        }


        return (

            region.regionSpecificEvidence ===
                true &&

            region.usable ===
                true
        );
    }


    // ======================================
    // OBTER CONFIANÇA REGIONAL
    // ======================================

    getRegionalConfidence(
        name
    ) {

        const region =
            this.getRegion(
                name
            );


        if (
            !region
        ) {

            return 0;
        }


        return this.clamp(

            this.safeNumber(
                region.stateConfidence
            ),

            0,

            1

        );
    }


    // ======================================
    // EXPORTAR MEDIÇÃO
    // ======================================

    exportMeasurement() {

        if (
            !this.lastMeasurement
        ) {

            return null;
        }


        try {

            return JSON.parse(

                JSON.stringify(
                    this.lastMeasurement
                )

            );

        } catch (_) {

            return null;
        }
    }


    // ======================================
    // EXPORTAR RESUMO
    // ======================================

    exportSummary() {

        if (
            !this.lastSummary
        ) {

            return null;
        }


        try {

            return JSON.parse(

                JSON.stringify(
                    this.lastSummary
                )

            );

        } catch (_) {

            return null;
        }
    }


    // ======================================
    // RESET
    // ======================================

    reset() {

        this.lastAnalysis =
            null;


        this.lastMeasurement =
            null;


        this.lastSummary =
            null;
    }
}


// ==========================================
// DISPONIBILIZAR GLOBALMENTE
// ==========================================

window.SpectralRegionalRuntime =
    SpectralRegionalRuntime;