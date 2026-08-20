// ==========================================
// SMOOTHVSTUDIO
// SPECTRAL REGIONAL MEASUREMENT
// V0.1
// ==========================================
//
// Camada leve de medição espectral regional.
//
// RESPONSABILIDADE:
//
// - receber as bandas já calculadas pelo
//   VocalAnalyzer;
// - agrupá-las em regiões acústicas;
// - calcular energia relativa regional;
// - calcular estabilidade regional;
// - calcular atividade regional;
// - calcular confiança da evidência;
// - preparar dados para o
//   SpectralTreatmentBridge;
// - preparar dados para o
//   SpectralDiagnosticObserver.
//
// ESTE MÓDULO NÃO:
//
// - processa AudioBuffer;
// - executa FFT;
// - cria filtros;
// - cria EQ;
// - altera ganho;
// - altera timbre;
// - aplica compressão;
// - aplica de-essing;
// - reconstrói espectro;
// - decide Warm / Neutral / Bright;
// - cria presets.
//
// PRINCÍPIO:
//
// As regiões são áreas de OBSERVAÇÃO.
//
// Elas não são processadores independentes.
//
// ==========================================


class SpectralRegionalMeasurement {


    constructor(
        options = {}
    ) {


        this.version =
            "0.1";


        // ==================================
        // CONFIGURAÇÃO DE SEGURANÇA
        // ==================================

        this.minimumConfidence =
            options.minimumConfidence ??
            0.55;


        this.minimumRegionalEvidence =
            options.minimumRegionalEvidence ??
            0.60;


        this.minimumFrames =
            options.minimumFrames ??
            3;


        this.minimumStability =
            options.minimumStability ??
            0.45;


        this.minimumTemporalActivity =
            options.minimumTemporalActivity ??
            0.08;


        // ==================================
        // REGIÕES
        // ==================================
        //
        // Estas regiões não representam
        // processadores.
        //
        // Elas apenas organizam a observação.
        //
        // ==================================

        this.regions = [

            {
                name:
                    "sub",

                lowHz:
                    20,

                highHz:
                    60
            },

            {
                name:
                    "bass",

                lowHz:
                    60,

                highHz:
                    120
            },

            {
                name:
                    "body",

                lowHz:
                    120,

                highHz:
                    250
            },

            {
                name:
                    "lowMid",

                lowHz:
                    250,

                highHz:
                    400
            },

            {
                name:
                    "mid",

                lowHz:
                    400,

                highHz:
                    2000
            },

            {
                name:
                    "presence",

                lowHz:
                    2000,

                highHz:
                    4000
            },

            {
                name:
                    "upperPresence",

                lowHz:
                    4000,

                highHz:
                    6000
            },

            {
                name:
                    "sibilance",

                lowHz:
                    6000,

                highHz:
                    10000
            },

            {
                name:
                    "air",

                lowHz:
                    10000,

                highHz:
                    20000
            }
        ];


        this.lastMeasurement =
            null;
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
    // STRING SEGURO
    // ======================================

    safeString(
        value,
        fallback = "unknown"
    ) {

        return typeof value ===
            "string"
            ? value
            : fallback;
    }


    // ======================================
    // OBTER FREQUÊNCIA CENTRAL
    // ======================================

    getBandFrequency(
        band
    ) {

        if (
            !band ||
            typeof band !==
            "object"
        ) {

            return 0;
        }


        const center =
            this.safeNumber(
                band.centerFrequency,
                NaN
            );


        if (
            Number.isFinite(
                center
            )
        ) {

            return center;
        }


        const low =
            this.safeNumber(
                band.lowFrequency,
                NaN
            );


        const high =
            this.safeNumber(
                band.highFrequency,
                NaN
            );


        if (
            Number.isFinite(low) &&
            Number.isFinite(high)
        ) {

            return (
                low +
                high
            ) / 2;
        }


        const frequency =
            this.safeNumber(
                band.frequency,
                0
            );


        return frequency;
    }


    // ======================================
    // OBTER SHARE ESPECTRAL
    // ======================================

    getBandEnergy(
        band
    ) {

        if (
            !band ||
            typeof band !==
            "object"
        ) {

            return 0;
        }


        const candidates = [

            band.spectrumShare,

            band.energyShare,

            band.relativeEnergy,

            band.share,

            band.energy
        ];


        for (
            let i = 0;
            i < candidates.length;
            i++
        ) {

            const value =
                Number(
                    candidates[i]
                );


            if (
                Number.isFinite(
                    value
                )
            ) {

                return Math.max(
                    0,
                    value
                );
            }
        }


        return 0;
    }


    // ======================================
    // OBTER ESTABILIDADE
    // ======================================

    getBandStability(
        band
    ) {

        if (
            !band ||
            typeof band !==
            "object"
        ) {

            return 0;
        }


        const candidates = [

            band.stability,

            band.stabilityScore,

            band.confidence
        ];


        for (
            let i = 0;
            i < candidates.length;
            i++
        ) {

            const value =
                Number(
                    candidates[i]
                );


            if (
                Number.isFinite(
                    value
                )
            ) {

                return this.clamp(
                    value,
                    0,
                    1
                );
            }
        }


        return 0;
    }


    // ======================================
    // OBTER CONFIANÇA
    // ======================================

    getBandConfidence(
        band
    ) {

        if (
            !band ||
            typeof band !==
            "object"
        ) {

            return 0;
        }


        const candidates = [

            band.confidence,

            band.confidenceScore,

            band.stability
        ];


        for (
            let i = 0;
            i < candidates.length;
            i++
        ) {

            const value =
                Number(
                    candidates[i]
                );


            if (
                Number.isFinite(
                    value
                )
            ) {

                return this.clamp(
                    value,
                    0,
                    1
                );
            }
        }


        return 0;
    }


    // ======================================
    // OBTER ATIVIDADE TEMPORAL
    // ======================================

    getBandActivity(
        band
    ) {

        if (
            !band ||
            typeof band !==
            "object"
        ) {

            return 0;
        }


        const candidates = [

            band.activity,

            band.activityScore,

            band.temporalActivity,

            band.presence
        ];


        for (
            let i = 0;
            i < candidates.length;
            i++
        ) {

            const value =
                Number(
                    candidates[i]
                );


            if (
                Number.isFinite(
                    value
                )
            ) {

                return this.clamp(
                    value,
                    0,
                    1
                );
            }
        }


        /*
         * Algumas bandas do Analyzer
         * podem não possuir atividade
         * explícita.
         *
         * Nesse caso não inventamos
         * atividade.
         */

        return 0;
    }


    // ======================================
    // TESTAR PERTENCIMENTO À REGIÃO
    // ======================================

    bandBelongsToRegion(
        band,
        region
    ) {

        const frequency =
            this.getBandFrequency(
                band
            );


        if (
            frequency <= 0
        ) {

            return false;
        }


        return (

            frequency >=
            region.lowHz &&

            frequency <
            region.highHz
        );
    }


    // ======================================
    // CALCULAR PESO DA BANDA
    // ======================================

    calculateBandWeight(
        band
    ) {

        const stability =
            this.getBandStability(
                band
            );


        const confidence =
            this.getBandConfidence(
                band
            );


        /*
         * A estabilidade tem maior peso
         * porque queremos evitar que uma
         * ocorrência isolada determine
         * um estado regional.
         */

        return this.clamp(

            (
                stability *
                0.60
            ) +

            (
                confidence *
                0.40
            ),

            0,

            1
        );
    }


    // ======================================
    // CALCULAR MÉDIA PONDERADA
    // ======================================

    calculateWeightedAverage(
        values,
        weights
    ) {

        if (
            !Array.isArray(values) ||
            !Array.isArray(weights) ||
            values.length === 0
        ) {

            return 0;
        }


        let weightedSum =
            0;


        let weightSum =
            0;


        for (
            let i = 0;
            i < values.length;
            i++
        ) {

            const value =
                this.safeNumber(
                    values[i]
                );


            const weight =
                Math.max(
                    0.01,
                    this.safeNumber(
                        weights[i],
                        0
                    )
                );


            weightedSum +=
                value *
                weight;


            weightSum +=
                weight;
        }


        if (
            weightSum <= 0
        ) {

            return 0;
        }


        return (
            weightedSum /
            weightSum
        );
    }


    // ======================================
    // MEDIR REGIÃO
    // ======================================

    measureRegion(
        region,
        bands
    ) {

        const matchedBands =
            [];


        for (
            let i = 0;
            i < bands.length;
            i++
        ) {

            const band =
                bands[i];


            if (
                this.bandBelongsToRegion(
                    band,
                    region
                )
            ) {

                matchedBands.push(
                    band
                );
            }
        }


        // ----------------------------------
        // SEM BANDAS
        // ----------------------------------

        if (
            matchedBands.length ===
            0
        ) {

            return {

                name:
                    region.name,

                lowHz:
                    region.lowHz,

                highHz:
                    region.highHz,

                bandCount:
                    0,

                usable:
                    false,

                regionalMeasurement:
                    false,

                regionSpecificEvidence:
                    false,

                energy:
                    0,

                energyShare:
                    0,

                relativeEnergy:
                    0,

                stability:
                    0,

                confidence:
                    0,

                activity:
                    0,

                temporalEvidence:
                    false,

                evidence:
                    "none",

                evidenceLevel:
                    "none",

                stateConfidence:
                    0,

                acousticState:
                    "uncertain",

                stateEvidence:
                    "none",

                reason:
                    "no-compatible-bands"
            };
        }


        // ----------------------------------
        // ACUMULAÇÃO
        // ----------------------------------

        const energies =
            [];


        const weights =
            [];


        const stabilities =
            [];


        const confidences =
            [];


        const activities =
            [];


        let rawEnergy =
            0;


        let weightedEnergy =
            0;


        let weightSum =
            0;


        for (
            let i = 0;
            i < matchedBands.length;
            i++
        ) {

            const band =
                matchedBands[i];


            const energy =
                this.getBandEnergy(
                    band
                );


            const stability =
                this.getBandStability(
                    band
                );


            const confidence =
                this.getBandConfidence(
                    band
                );


            const activity =
                this.getBandActivity(
                    band
                );


            const weight =
                this.calculateBandWeight(
                    band
                );


            energies.push(
                energy
            );


            weights.push(
                weight
            );


            stabilities.push(
                stability
            );


            confidences.push(
                confidence
            );


            activities.push(
                activity
            );


            rawEnergy +=
                energy;


            weightedEnergy +=
                energy *
                weight;


            weightSum +=
                weight;
        }


        const energyShare =
            rawEnergy;


        const relativeEnergy =
            weightSum > 0
                ? weightedEnergy /
                  weightSum
                : 0;


        const stability =
            this.calculateWeightedAverage(
                stabilities,
                weights
            );


        const confidence =
            this.calculateWeightedAverage(
                confidences,
                weights
            );


        const activity =
            this.calculateWeightedAverage(
                activities,
                weights
            );


        const temporalEvidence =
            activity >=
            this.minimumTemporalActivity;


        // ----------------------------------
        // CONFIANÇA REGIONAL
        // ----------------------------------

        const bandCoverage =
            this.clamp(

                matchedBands.length /
                Math.max(
                    this.minimumFrames,
                    1
                ),

                0,

                1
            );


        const stabilityEvidence =
            this.clamp(

                (
                    stability -
                    this.minimumStability
                ) /
                Math.max(
                    1 -
                    this.minimumStability,
                    0.01
                ),

                0,

                1
            );


        const confidenceEvidence =
            this.clamp(
                confidence,
                0,
                1
            );


        const regionalConfidence =
            this.clamp(

                (
                    bandCoverage *
                    0.25
                ) +

                (
                    stabilityEvidence *
                    0.35
                ) +

                (
                    confidenceEvidence *
                    0.40
                ),

                0,

                1
            );


        // ----------------------------------
        // EVIDÊNCIA
        // ----------------------------------

        let evidence =
            "weak";


        if (
            regionalConfidence >=
            this.minimumRegionalEvidence
        ) {

            evidence =
                "strong";

        } else if (
            regionalConfidence >=
            0.40
        ) {

            evidence =
                "moderate";
        }


        // ----------------------------------
        // USABILIDADE
        // ----------------------------------

        const usable =
            matchedBands.length >=
            1 &&

            stability >=
            this.minimumStability &&

            confidence >=
            this.minimumConfidence &&

            regionalConfidence >=
            this.minimumRegionalEvidence;


        /*
         * Ainda não transformamos energia
         * em "elevated" ou "recessed".
         *
         * A medição apenas estabelece
         * evidência regional.
         */

        const state =
            usable
                ? "supported"
                : "uncertain";


        return {

            name:
                region.name,

            lowHz:
                region.lowHz,

            highHz:
                region.highHz,

            bandCount:
                matchedBands.length,

            usable,

            regionalMeasurement:
                true,

            regionSpecificEvidence:
                true,

            energy:
                rawEnergy,

            energyShare,

            relativeEnergy,

            stability,

            confidence,

            activity,

            temporalEvidence,

            evidence,

            evidenceLevel:
                evidence,

            stateConfidence:
                regionalConfidence,

            acousticState:
                state,

            stateEvidence:
                usable
                    ? "regional-band-evidence"
                    : "insufficient-regional-evidence",

            reason:
                usable
                    ? "regional-evidence-available"
                    : "regional-evidence-below-threshold",

            bands:
                matchedBands.map(
                    (
                        band
                    ) => ({

                        centerFrequency:
                            this.getBandFrequency(
                                band
                            ),

                        energy:
                            this.getBandEnergy(
                                band
                            ),

                        stability:
                            this.getBandStability(
                                band
                            ),

                        confidence:
                            this.getBandConfidence(
                                band
                            ),

                        activity:
                            this.getBandActivity(
                                band
                            )
                    })
                )
        };
    }


    // ======================================
    // MEDIR TODAS AS REGIÕES
    // ======================================

    measureRegions(
        bands
    ) {

        const result =
            {};


        for (
            let i = 0;
            i < this.regions.length;
            i++
        ) {

            const region =
                this.regions[i];


            result[
                region.name
            ] =
                this.measureRegion(
                    region,
                    bands
                );
        }


        return result;
    }


    // ======================================
    // ENERGIA TOTAL
    // ======================================

    calculateTotalEnergy(
        regions
    ) {

        const names =
            Object.keys(
                regions
            );


        let total =
            0;


        for (
            let i = 0;
            i < names.length;
            i++
        ) {

            total +=
                Math.max(
                    0,
                    this.safeNumber(
                        regions[
                            names[i]
                        ].energyShare
                    )
                );
        }


        return total;
    }


    // ======================================
    // NORMALIZAR ENERGIA REGIONAL
    // ======================================

    normalizeRegionalEnergy(
        regions,
        totalEnergy
    ) {

        const names =
            Object.keys(
                regions
            );


        for (
            let i = 0;
            i < names.length;
            i++
        ) {

            const region =
                regions[
                    names[i]
                ];


            if (
                totalEnergy > 0
            ) {

                region.normalizedEnergy =
                    region.energyShare /
                    totalEnergy;

            } else {

                region.normalizedEnergy =
                    0;
            }
        }


        return regions;
    }


    // ======================================
    // CALCULAR CENTRO REGIONAL
    // ======================================

    calculateRegionalCenter(
        regions
    ) {

        let weightedFrequency =
            0;


        let energySum =
            0;


        const names =
            Object.keys(
                regions
            );


        for (
            let i = 0;
            i < names.length;
            i++
        ) {

            const region =
                regions[
                    names[i]
                ];


            const center =
                (
                    region.lowHz +
                    region.highHz
                ) / 2;


            const energy =
                Math.max(
                    0,
                    this.safeNumber(
                        region.normalizedEnergy
                    )
                );


            weightedFrequency +=
                center *
                energy;


            energySum +=
                energy;
        }


        if (
            energySum <= 0
        ) {

            return 0;
        }


        return (
            weightedFrequency /
            energySum
        );
    }


    // ======================================
    // CALCULAR BALANÇO BAIXO / ALTO
    // ======================================

    calculateLowHighBalance(
        regions
    ) {

        const lowNames = [

            "sub",

            "bass",

            "body",

            "lowMid"
        ];


        const highNames = [

            "presence",

            "upperPresence",

            "sibilance",

            "air"
        ];


        let low =
            0;


        let high =
            0;


        for (
            let i = 0;
            i < lowNames.length;
            i++
        ) {

            const region =
                regions[
                    lowNames[i]
                ];


            if (
                region
            ) {

                low +=
                    Math.max(
                        0,
                        this.safeNumber(
                            region.normalizedEnergy
                        )
                    );
            }
        }


        for (
            let i = 0;
            i < highNames.length;
            i++
        ) {

            const region =
                regions[
                    highNames[i]
                ];


            if (
                region
            ) {

                high +=
                    Math.max(
                        0,
                        this.safeNumber(
                            region.normalizedEnergy
                        )
                    );
            }
        }


        return {

            low,

            high,

            difference:
                high -
                low,

            ratio:
                low > 0
                    ? high /
                      low
                    : 0
        };
    }


    // ======================================
    // EVIDÊNCIA TEMPORAL GLOBAL
    // ======================================

    calculateTemporalEvidence(
        regions
    ) {

        const names =
            Object.keys(
                regions
            );


        if (
            names.length ===
            0
        ) {

            return 0;
        }


        let weightedActivity =
            0;


        let weightSum =
            0;


        for (
            let i = 0;
            i < names.length;
            i++
        ) {

            const region =
                regions[
                    names[i]
                ];


            const activity =
                this.clamp(
                    this.safeNumber(
                        region.activity
                    ),
                    0,
                    1
                );


            const energy =
                Math.max(
                    0,
                    this.safeNumber(
                        region.normalizedEnergy
                    )
                );


            weightedActivity +=
                activity *
                energy;


            weightSum +=
                energy;
        }


        if (
            weightSum <= 0
        ) {

            return 0;
        }


        return this.clamp(

            weightedActivity /
            weightSum,

            0,

            1
        );
    }


    // ======================================
    // CONFIANÇA GLOBAL REGIONAL
    // ======================================

    calculateGlobalRegionalConfidence(
        regions
    ) {

        const names =
            Object.keys(
                regions
            );


        if (
            names.length ===
            0
        ) {

            return 0;
        }


        let sum =
            0;


        let count =
            0;


        for (
            let i = 0;
            i < names.length;
            i++
        ) {

            const region =
                regions[
                    names[i]
                ];


            if (
                region.bandCount <=
                0
            ) {

                continue;
            }


            sum +=
                this.clamp(
                    this.safeNumber(
                        region.stateConfidence
                    ),
                    0,
                    1
                );


            count++;
        }


        if (
            count ===
            0
        ) {

            return 0;
        }


        return this.clamp(
            sum /
            count,
            0,
            1
        );
    }


    // ======================================
    // ANALISAR
    // ======================================

    analyze(
        analysis
    ) {

        if (
            !analysis ||
            !Array.isArray(
                analysis.bands
            )
        ) {

            const invalid = {

                version:
                    this.version,

                valid:
                    false,

                confidence:
                    0,

                regions:
                    {},

                reason:
                    "analysis-bands-unavailable"
            };


            this.lastMeasurement =
                invalid;


            return invalid;
        }


        const bands =
            analysis.bands;


        // ----------------------------------
        // MEDIÇÃO REGIONAL
        // ----------------------------------

        let regions =
            this.measureRegions(
                bands
            );


        // ----------------------------------
        // ENERGIA TOTAL
        // ----------------------------------

        const totalEnergy =
            this.calculateTotalEnergy(
                regions
            );


        // ----------------------------------
        // NORMALIZAÇÃO
        // ----------------------------------

        regions =
            this.normalizeRegionalEnergy(
                regions,
                totalEnergy
            );


        // ----------------------------------
        // CENTRO REGIONAL
        // ----------------------------------

        const regionalCenter =
            this.calculateRegionalCenter(
                regions
            );


        // ----------------------------------
        // BALANÇO LOW / HIGH
        // ----------------------------------

        const lowHigh =
            this.calculateLowHighBalance(
                regions
            );


        // ----------------------------------
        // EVIDÊNCIA TEMPORAL
        // ----------------------------------

        const temporalEvidence =
            this.calculateTemporalEvidence(
                regions
            );


        // ----------------------------------
        // CONFIANÇA
        // ----------------------------------

        const confidence =
            this.calculateGlobalRegionalConfidence(
                regions
            );


        // ----------------------------------
        // CONTAGEM
        // ----------------------------------

        let usableRegions =
            0;


        let supportedRegions =
            0;


        const names =
            Object.keys(
                regions
            );


        for (
            let i = 0;
            i < names.length;
            i++
        ) {

            const region =
                regions[
                    names[i]
                ];


            if (
                region.usable
            ) {

                usableRegions++;
            }


            if (
                region.acousticState ===
                "supported"
            ) {

                supportedRegions++;
            }
        }


        // ----------------------------------
        // RESULTADO
        // ----------------------------------

        const result = {

            version:
                this.version,

            valid:
                true,

            analysisVersion:
                this.safeString(
                    analysis.version,
                    "unknown"
                ),

            bandCount:
                bands.length,

            regionCount:
                names.length,

            usableRegions,

            supportedRegions,

            confidence,

            evidence:
                confidence >=
                this.minimumRegionalEvidence
                    ? "strong"
                    : confidence >=
                      0.40
                        ? "moderate"
                        : "weak",

            regionalCenterHz:
                regionalCenter,

            lowHighBalance:
                lowHigh,

            temporalEvidence,

            regions,

            decisionPolicy: {

                analysisOnly:
                    true,

                regionSpecificEvidence:
                    true,

                processingPermission:
                    "none",

                independentRegionalEvidenceRequired:
                    true,

                tonalReferenceDoesNotCreateProcessing:
                    true
            }
        };


        this.lastMeasurement =
            result;


        return result;
    }


    // ======================================
    // OBTER ÚLTIMA MEDIÇÃO
    // ======================================

    getLastMeasurement() {

        return this.lastMeasurement;
    }


    // ======================================
    // OBTER REGIÃO
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
    // RESUMO
    // ======================================

    getSummary() {

        if (
            !this.lastMeasurement
        ) {

            return {

                available:
                    false
            };
        }


        return {

            available:
                true,

            valid:
                this.lastMeasurement.valid ===
                true,

            version:
                this.lastMeasurement.version,

            bandCount:
                this.lastMeasurement.bandCount,

            regionCount:
                this.lastMeasurement.regionCount,

            usableRegions:
                this.lastMeasurement.usableRegions,

            supportedRegions:
                this.lastMeasurement.supportedRegions,

            confidence:
                this.lastMeasurement.confidence,

            evidence:
                this.lastMeasurement.evidence,

            regionalCenterHz:
                this.lastMeasurement
                    .regionalCenterHz,

            lowHighBalance:
                this.lastMeasurement
                    .lowHighBalance,

            temporalEvidence:
                this.lastMeasurement
                    .temporalEvidence,

            processingPermission:
                "none"
        };
    }


    // ======================================
    // EXPORTAR
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
    // RESET
    // ======================================

    reset() {

        this.lastMeasurement =
            null;
    }
}


// ==========================================
// DISPONIBILIZAR GLOBALMENTE
// ==========================================

window.SpectralRegionalMeasurement =
    SpectralRegionalMeasurement;