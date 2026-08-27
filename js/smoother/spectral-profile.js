// ==========================================
// SMOOTHVSTUDIO
// SPECTRAL PROFILE
// V0.3
// ==========================================
//
// Camada intermediária entre:
//
// VocalAnalyzer
//        ↓
// SpectralProfile
//        ↓
// VocalTreatmentPlan
//
// RESPONSABILIDADE:
//
// Interpretar a análise espectral fornecida
// pelo Analyzer.
//
// Este módulo NÃO:
//
// - altera AudioBuffer
// - aplica EQ
// - cria filtros
// - altera volume
// - altera timbre
// - reconstrói regiões
//
// V0.3:
//
// - compatibilidade direta com Analyzer V0.7
// - suporte a bandas estruturadas
// - suporte futuro a arrays espectrais
// - cobertura espectral explícita
// - distinção entre cobertura e estabilidade
// - tilt espectral refinado
// - evidência superior conservadora
// - proteção contra falsa deficiência
// - preparação para futura reconstrução
//
// IMPORTANTE:
//
// O Analyzer V0.7 atualmente fornece:
//
// bands: {
//
//     body,
//     lowMid,
//     mid,
//     presence,
//     sibilance,
//     air
//
// }
//
// Ele NÃO fornece estabilidade individual
// para essas seis bandas.
//
// Portanto:
//
// stableBands NÃO será inventado.
//
// Quando estabilidade individual não existir,
// o módulo utilizará cobertura espectral,
// confiança global e consistência dos dados.
//
// ==========================================


class SpectralProfile {


    constructor(options = {}) {


        // ==================================
        // CONFIGURAÇÃO GERAL
        // ==================================

        this.minimumConfidence =
            options.minimumConfidence ??
            0.55;


        this.minimumStableBands =
            options.minimumStableBands ??
            5;


        this.referenceToleranceDb =
            options.referenceToleranceDb ??
            1.25;


        this.maxReferenceDistanceDb =
            options.maxReferenceDistanceDb ??
            4.0;


        this.minimumReferenceSeparationDb =
            options.minimumReferenceSeparationDb ??
            0.20;


        // ==================================
        // CONFIGURAÇÃO DE COBERTURA
        // ==================================

        this.minimumCoverageBands =
            options.minimumCoverageBands ??
            4;


        this.minimumCoverageConfidence =
            options.minimumCoverageConfidence ??
            0.55;


        // ==================================
        // CONTEÚDO SUPERIOR
        // ==================================
        //
        // A análise superior é conservadora.
        //
        // Não significa:
        //
        // "faltam agudos"
        //
        // Significa:
        //
        // "há evidência suficiente de que o
        // conteúdo superior está reduzido em
        // relação ao conteúdo inferior."
        //
        // ==================================

        this.minimumUpperContentConfidence =
            options.minimumUpperContentConfidence ??
            0.60;


        this.minimumUpperBands =
            options.minimumUpperBands ??
            2;


        this.upperContentObserveThreshold =
            options.upperContentObserveThreshold ??
            0.32;


        this.upperContentCandidateThreshold =
            options.upperContentCandidateThreshold ??
            0.18;


        this.minimumUpperToLowerRatio =
            options.minimumUpperToLowerRatio ??
            0.05;


        // ==================================
        // REGIÕES ESPECTRAIS
        // ==================================

        this.lowerReferenceLow =
            options.lowerReferenceLow ??
            700;


        this.lowerReferenceHigh =
            options.lowerReferenceHigh ??
            2500;


        this.upperReferenceLow =
            options.upperReferenceLow ??
            2500;


        this.upperReferenceHigh =
            options.upperReferenceHigh ??
            12000;


        // ==================================
        // PESOS DE COBERTURA
        // ==================================

        this.minimumBandEnergy =
            options.minimumBandEnergy ??
            0.0000001;


        this.version =
            "0.3";


        this.lastProfile =
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
    // ABSOLUTO SEGURO
    // ======================================

    absolute(
        value
    ) {

        return Math.abs(
            this.safeNumber(
                value
            )
        );
    }


    // ======================================
    // DB SEGURO
    // ======================================

    dbFromRatio(
        ratio
    ) {

        const safeRatio =
            Math.max(
                this.safeNumber(
                    ratio,
                    0
                ),
                0.000001
            );


        return 20 *
            Math.log10(
                safeRatio
            );
    }


    // ======================================
    // OBTER COMPARAÇÃO
    // ======================================

    getComparison(
        analysis,
        name
    ) {

        if (
            !analysis ||
            !analysis.comparisons
        ) {

            return null;
        }


        return (
            analysis
                .comparisons[name]
            ||
            null
        );
    }


    // ======================================
    // OBTER BANDAS
    // ======================================
    //
    // O Analyzer V0.7 fornece um objeto.
    //
    // Também aceitamos arrays futuros.
    //
    // ======================================

    getBandEntries(
        analysis
    ) {

        if (
            !analysis ||
            !analysis.bands
        ) {

            return [];
        }


        // ----------------------------------
        // FORMATO ATUAL DO ANALYZER
        // ----------------------------------

        if (
            !Array.isArray(
                analysis.bands
            )
        ) {

            const source =
                analysis.bands;


            return [

                {
                    name:
                        "body",

                    lowFrequency:
                        120,

                    highFrequency:
                        500,

                    centerFrequency:
                        310,

                    energy:
                        this.safeNumber(
                            source.body
                        ),

                    stability:
                        null
                },


                {
                    name:
                        "lowMid",

                    lowFrequency:
                        500,

                    highFrequency:
                        1200,

                    centerFrequency:
                        850,

                    energy:
                        this.safeNumber(
                            source.lowMid
                        ),

                    stability:
                        null
                },


                {
                    name:
                        "mid",

                    lowFrequency:
                        1200,

                    highFrequency:
                        2500,

                    centerFrequency:
                        1850,

                    energy:
                        this.safeNumber(
                            source.mid
                        ),

                    stability:
                        null
                },


                {
                    name:
                        "presence",

                    lowFrequency:
                        2500,

                    highFrequency:
                        5000,

                    centerFrequency:
                        3750,

                    energy:
                        this.safeNumber(
                            source.presence
                        ),

                    stability:
                        null
                },


                {
                    name:
                        "sibilance",

                    lowFrequency:
                        5000,

                    highFrequency:
                        9500,

                    centerFrequency:
                        7250,

                    energy:
                        this.safeNumber(
                            source.sibilance
                        ),

                    stability:
                        null
                },


                {
                    name:
                        "air",

                    lowFrequency:
                        9500,

                    highFrequency:
                        14000,

                    centerFrequency:
                        11750,

                    energy:
                        this.safeNumber(
                            source.air
                        ),

                    stability:
                        null
                }
            ];
        }


        // ----------------------------------
        // FORMATO ESPECTRAL FUTURO
        // ----------------------------------

        const entries = [];


        for (
            let i = 0;
            i < analysis.bands.length;
            i++
        ) {

            const band =
                analysis.bands[i];


            if (
                !band
            ) {

                continue;
            }


            entries.push({

                name:
                    band.name ||
                    `band-${i}`,

                lowFrequency:
                    this.safeNumber(
                        band.lowFrequency,
                        0
                    ),

                highFrequency:
                    this.safeNumber(
                        band.highFrequency,
                        0
                    ),

                centerFrequency:
                    this.safeNumber(
                        band.centerFrequency,
                        0
                    ),

                energy:
                    Math.max(
                        0,
                        this.safeNumber(
                            band.spectrumShare ??
                            band.energy ??
                            band.amplitude,
                            0
                        )
                    ),

                stability:
                    Number.isFinite(
                        Number(
                            band.stability
                        )
                    )
                        ? this.clamp(
                            Number(
                                band.stability
                            ),
                            0,
                            1
                        )
                        : null
            });
        }


        return entries;
    }


    // ======================================
    // CONTAR BANDAS ESTÁVEIS
    // ======================================

    countStableBands(
        analysis
    ) {

        const bands =
            this.getBandEntries(
                analysis
            );


        let count =
            0;


        for (
            let i = 0;
            i < bands.length;
            i++
        ) {

            const stability =
                bands[i].stability;


            if (
                stability !== null &&
                stability >=
                this.minimumConfidence
            ) {

                count++;
            }
        }


        return count;
    }


    // ======================================
    // CONTAR BANDAS UTILIZÁVEIS
    // ======================================

    countUsableBands(
        analysis
    ) {

        const bands =
            this.getBandEntries(
                analysis
            );


        let count =
            0;


        for (
            let i = 0;
            i < bands.length;
            i++
        ) {

            if (
                bands[i].energy >
                this.minimumBandEnergy
            ) {

                count++;
            }
        }


        return count;
    }
        // ======================================
    // COBERTURA ESPECTRAL
    // ======================================
    //
    // IMPORTANTE:
    //
    // cobertura != estabilidade.
    //
    // O Analyzer atual possui seis regiões
    // fixas, mas não possui estabilidade
    // individual por banda.
    //
    // Portanto não transformamos cobertura
    // em "stableBands".
    //
    // ======================================

    calculateCoverage(
        analysis
    ) {

        const bands =
            this.getBandEntries(
                analysis
            );


        if (
            bands.length === 0
        ) {

            return {

                available:
                    false,

                usableBands:
                    0,

                totalBands:
                    0,

                coverage:
                    0,

                confidence:
                    0
            };
        }


        let usableBands =
            0;


        let energySum =
            0;


        let weightedEnergy =
            0;


        let weightSum =
            0;


        let hasIndividualStability =
            false;


        let stabilitySum =
            0;


        let stabilityCount =
            0;


        for (
            let i = 0;
            i < bands.length;
            i++
        ) {

            const band =
                bands[i];


            const energy =
                Math.max(
                    0,
                    this.safeNumber(
                        band.energy
                    )
                );


            if (
                energy >
                this.minimumBandEnergy
            ) {

                usableBands++;
            }


            energySum +=
                energy;


            if (
                band.stability !== null
            ) {

                hasIndividualStability =
                    true;


                stabilitySum +=
                    band.stability;


                stabilityCount++;
            }
        }


        const totalBands =
            bands.length;


        const coverage =
            totalBands > 0
                ? usableBands /
                  totalBands
                : 0;


        const stability =
            stabilityCount > 0
                ? stabilitySum /
                  stabilityCount
                : null;


        /*
         * Quando o Analyzer não fornece
         * estabilidade individual, não
         * inventamos uma.
         *
         * A confiança de cobertura depende
         * somente da quantidade de bandas
         * realmente utilizáveis.
         */

        const coverageConfidence =
            this.clamp(
                coverage /
                Math.max(
                    this.minimumCoverageBands /
                    Math.max(
                        totalBands,
                        1
                    ),
                    0.0001
                ),
                0,
                1
            );


        return {

            available:
                usableBands > 0,

            usableBands,

            totalBands,

            coverage,

            confidence:
                coverageConfidence,

            hasIndividualStability,

            stability,

            energySum,

            weightedEnergy
        };
    }


    // ======================================
    // CONFIANÇA GLOBAL
    // ======================================

    calculateConfidence(
        analysis
    ) {

        if (
            !analysis
        ) {

            return 0;
        }


        const analysisConfidence =
            this.clamp(
                this.safeNumber(
                    analysis.confidence
                ),
                0,
                1
            );


        const coverage =
            this.calculateCoverage(
                analysis
            );


        /*
         * Se o Analyzer fornecer estabilidade
         * individual, ela poderá participar.
         *
         * Caso contrário, não é fabricada.
         */

        let stabilityContribution =
            0;


        let stabilityWeight =
            0;


        if (
            coverage.hasIndividualStability &&
            coverage.stability !== null
        ) {

            stabilityContribution =
                coverage.stability;

            stabilityWeight =
                0.20;
        }


        const baseWeight =
            1 -
            stabilityWeight;


        const confidence =
            this.clamp(
                (
                    analysisConfidence *
                    (
                        baseWeight *
                        0.70
                    )
                ) +
                (
                    coverage.confidence *
                    (
                        baseWeight *
                        0.30
                    )
                ) +
                (
                    stabilityContribution *
                    stabilityWeight
                ),
                0,
                1
            );


        return confidence;
    }


    // ======================================
    // DISTÂNCIA MÉDIA DA REFERÊNCIA
    // ======================================

    calculateReferenceDistance(
        comparison
    ) {

        if (
            !comparison ||
            !Array.isArray(
                comparison.comparisons
            ) ||
            comparison.comparisons.length === 0
        ) {

            return {

                distanceDb:
                    Infinity,

                weightedDistanceDb:
                    Infinity,

                usableBands:
                    0,

                stableBands:
                    0
            };
        }


        let absoluteSum =
            0;


        let weightedSum =
            0;


        let weightSum =
            0;


        let usableBands =
            0;


        let stableBands =
            0;


        for (
            let i = 0;
            i <
            comparison.comparisons.length;
            i++
        ) {

            const band =
                comparison
                    .comparisons[i];


            const distance =
                this.safeNumber(
                    band.distanceDb,
                    0
                );


            const confidence =
                this.clamp(
                    this.safeNumber(
                        band.confidence,
                        0
                    ),
                    0,
                    1
                );


            const absoluteDistance =
                this.absolute(
                    distance
                );


            const boundedDistance =
                this.clamp(
                    absoluteDistance,
                    0,
                    this.maxReferenceDistanceDb
                );


            const weight =
                Math.max(
                    0.05,
                    confidence
                );


            absoluteSum +=
                boundedDistance;


            weightedSum +=
                boundedDistance *
                weight;


            weightSum +=
                weight;


            usableBands++;


            if (
                confidence >=
                this.minimumConfidence
            ) {

                stableBands++;
            }
        }


        const distanceDb =
            usableBands > 0
                ? absoluteSum /
                  usableBands
                : Infinity;


        const weightedDistanceDb =
            weightSum > 0
                ? weightedSum /
                  weightSum
                : Infinity;


        return {

            distanceDb,

            weightedDistanceDb,

            usableBands,

            stableBands
        };
    }


    // ======================================
    // REFERÊNCIA MAIS PRÓXIMA
    // ======================================

    determineClosestReference(
        references
    ) {

        const names = [
            "neutral",
            "warm",
            "bright"
        ];


        let closest =
            null;


        for (
            let i = 0;
            i < names.length;
            i++
        ) {

            const name =
                names[i];


            const item =
                references[name];


            if (
                !item ||
                !Number.isFinite(
                    item.weightedDistanceDb
                )
            ) {

                continue;
            }


            if (
                closest === null ||
                item.weightedDistanceDb <
                closest.weightedDistanceDb
            ) {

                closest = {

                    name,

                    weightedDistanceDb:
                        item.weightedDistanceDb,

                    distanceDb:
                        item.distanceDb
                };
            }
        }


        return closest;
    }
        // ======================================
    // SEPARAÇÃO ENTRE REFERÊNCIAS
    // ======================================

    calculateReferenceSeparation(
        references,
        closest
    ) {

        if (
            !closest
        ) {

            return {

                separationDb:
                    0,

                ambiguous:
                    true
            };
        }


        const distances = [];


        const names = [
            "neutral",
            "warm",
            "bright"
        ];


        for (
            let i = 0;
            i < names.length;
            i++
        ) {

            const item =
                references[
                    names[i]
                ];


            if (
                item &&
                Number.isFinite(
                    item.weightedDistanceDb
                )
            ) {

                distances.push(
                    item.weightedDistanceDb
                );
            }
        }


        distances.sort(
            (
                a,
                b
            ) =>
                a - b
        );


        if (
            distances.length < 2
        ) {

            return {

                separationDb:
                    0,

                ambiguous:
                    true
            };
        }


        const separationDb =
            distances[1] -
            distances[0];


        return {

            separationDb,

            ambiguous:
                separationDb <
                this.minimumReferenceSeparationDb
        };
    }


    // ======================================
    // CLASSIFICAR TENDÊNCIA
    // ======================================

    classifyTonalTendency(
        closest,
        separation,
        confidence
    ) {

        if (
            !closest
        ) {

            return {

                label:
                    "unknown",

                confidence:
                    0,

                actionable:
                    false
            };
        }


        if (
            confidence <
            this.minimumConfidence
        ) {

            return {

                label:
                    "unknown",

                confidence,

                actionable:
                    false
            };
        }


        if (
            separation.ambiguous
        ) {

            return {

                label:
                    "neutral",

                confidence:
                    confidence *
                    0.50,

                actionable:
                    false
            };
        }


        if (
            closest.weightedDistanceDb >
            this.maxReferenceDistanceDb
        ) {

            return {

                label:
                    "outside-reference",

                confidence:
                    confidence *
                    0.50,

                actionable:
                    false
            };
        }


        return {

            label:
                closest.name,

            confidence,

            actionable:
                true
        };
    }


    // ======================================
    // MEDIR DIREÇÃO ESPECTRAL
    // ======================================
    //
    // Com o Analyzer V0.7:
    //
    // lower =
    // lowMid + mid
    //
    // upper =
    // presence + sibilance + air
    //
    // Não fingimos possuir FFT.
    //
    // ======================================

    calculateSpectralTilt(
        analysis
    ) {

        const bands =
            this.getBandEntries(
                analysis
            );


        if (
            bands.length === 0
        ) {

            return {

                lowEnergy:
                    0,

                highEnergy:
                    0,

                tilt:
                    0,

                lowerBandCount:
                    0,

                upperBandCount:
                    0,

                confidence:
                    0
            };
        }


        let lowEnergy =
            0;


        let highEnergy =
            0;


        let lowWeight =
            0;


        let highWeight =
            0;


        let lowerBandCount =
            0;


        let upperBandCount =
            0;


        for (
            let i = 0;
            i < bands.length;
            i++
        ) {

            const band =
                bands[i];


            const frequency =
                this.safeNumber(
                    band.centerFrequency
                );


            const energy =
                Math.max(
                    0,
                    this.safeNumber(
                        band.energy
                    )
                );


            if (
                energy <=
                this.minimumBandEnergy
            ) {

                continue;
            }


            const stabilityWeight =
                band.stability !== null
                    ? Math.max(
                        0.10,
                        band.stability
                    )
                    : 1;


            const weightedEnergy =
                energy *
                stabilityWeight;


            if (
                frequency >=
                this.lowerReferenceLow &&
                frequency <
                this.lowerReferenceHigh
            ) {

                lowEnergy +=
                    weightedEnergy;


                lowWeight +=
                    stabilityWeight;


                lowerBandCount++;
            }


            else if (
                frequency >=
                this.upperReferenceLow &&
                frequency <
                this.upperReferenceHigh
            ) {

                highEnergy +=
                    weightedEnergy;


                highWeight +=
                    stabilityWeight;


                upperBandCount++;
            }
        }


        const normalizedLow =
            lowWeight > 0
                ? lowEnergy /
                  lowWeight
                : 0;


        const normalizedHigh =
            highWeight > 0
                ? highEnergy /
                  highWeight
                : 0;


        const denominator =
            normalizedLow +
            normalizedHigh +
            0.000001;


        /*
         * Tilt normalizado.
         *
         * -1 = forte predominância inferior
         *  0 = equilíbrio
         * +1 = forte predominância superior
         */

        const tilt =
            this.clamp(
                (
                    normalizedHigh -
                    normalizedLow
                ) /
                denominator,
                -1,
                1
            );


        const coverage =
            this.clamp(
                (
                    lowerBandCount +
                    upperBandCount
                ) /
                Math.max(
                    5,
                    bands.length
                ),
                0,
                1
            );


        return {

            lowEnergy:
                normalizedLow,

            highEnergy:
                normalizedHigh,

            tilt,

            lowerBandCount,

            upperBandCount,

            confidence:
                coverage
        };
    }


    // ======================================
    // OBTER REGIÃO ESPECTRAL
    // ======================================

    collectRegion(
        analysis,
        lowFrequency,
        highFrequency
    ) {

        const bands =
            this.getBandEntries(
                analysis
            );


        let energy =
            0;


        let weight =
            0;


        let bandCount =
            0;


        let stableBandCount =
            0;


        let hasStability =
            false;


        for (
            let i = 0;
            i < bands.length;
            i++
        ) {

            const band =
                bands[i];


            const frequency =
                this.safeNumber(
                    band.centerFrequency
                );


            if (
                frequency <
                lowFrequency ||
                frequency >=
                highFrequency
            ) {

                continue;
            }


            const bandEnergy =
                Math.max(
                    0,
                    this.safeNumber(
                        band.energy
                    )
                );


            if (
                bandEnergy <=
                this.minimumBandEnergy
            ) {

                continue;
            }


            const bandWeight =
                band.stability !== null
                    ? Math.max(
                        0.10,
                        band.stability
                    )
                    : 1;


            if (
                band.stability !== null
            ) {

                hasStability =
                    true;


                if (
                    band.stability >=
                    this.minimumConfidence
                ) {

                    stableBandCount++;
                }
            }


            energy +=
                bandEnergy *
                bandWeight;


            weight +=
                bandWeight;


            bandCount++;
        }


        return {

            energy:
                weight > 0
                    ? energy /
                      weight
                    : 0,

            bandCount,

            stableBandCount,

            hasStability,

            confidence:
                this.clamp(
                    bandCount /
                    Math.max(
                        2,
                        this.minimumUpperBands
                    ),
                    0,
                    1
                )
        };
    }
        // ======================================
    // EVIDÊNCIA DE CONTEÚDO SUPERIOR
    // ======================================
    //
    // OBJETIVO:
    //
    // Detectar se existe evidência
    // conservadora de redução de conteúdo
    // superior.
    //
    // NÃO significa simplesmente:
    //
    // "voz escura"
    //
    // Também não significa:
    //
    // "faltam agudos".
    //
    // A interpretação depende de:
    //
    // - relação upper/lower;
    // - cobertura;
    // - confiança global;
    // - presença de pelo menos duas
    //   regiões superiores;
    // - estabilidade, quando disponível;
    // - coerência da evidência.
    //
    // ======================================

    calculateUpperContentEvidence(
        analysis
    ) {

        const unavailable =
            (
                reason,
                details = {}
            ) => {

                return {

                    available:
                        false,

                    score:
                        0,

                    confidence:
                        0,

                    lowerReferenceEnergy:
                        0,

                    upperReferenceEnergy:
                        0,

                    upperToLowerRatio:
                        0,

                    upperToLowerDb:
                        -120,

                    stability:
                        0,

                    bandwidthDeficiency:
                        false,

                    status:
                        "preserve",

                    reason,

                    bands: {

                        lower:
                            details.lowerBands ||
                            0,

                        upper:
                            details.upperBands ||
                            0,

                        stableLower:
                            details.stableLower ||
                            0,

                        stableUpper:
                            details.stableUpper ||
                            0
                    }
                };
            };


        if (
            !analysis
        ) {

            return unavailable(
                "missing-analysis"
            );
        }


        const lower =
            this.collectRegion(
                analysis,
                this.lowerReferenceLow,
                this.lowerReferenceHigh
            );


        const upper =
            this.collectRegion(
                analysis,
                this.upperReferenceLow,
                this.upperReferenceHigh
            );


        const globalConfidence =
            this.calculateConfidence(
                analysis
            );


        const coverage =
            this.calculateCoverage(
                analysis
            );


        /*
         * No Analyzer atual:
         *
         * lower:
         *   mid + lowMid parcial
         *
         * upper:
         *   presence
         *   sibilance
         *   air
         *
         * Para uma análise de deficiência
         * superior precisamos de pelo menos
         * duas regiões superiores.
         */

        if (
            lower.bandCount === 0
        ) {

            return unavailable(
                "insufficient-lower-reference",
                {
                    lowerBands:
                        lower.bandCount,

                    upperBands:
                        upper.bandCount
                }
            );
        }


        if (
            upper.bandCount <
            this.minimumUpperBands
        ) {

            return unavailable(
                "insufficient-upper-band-coverage",
                {
                    lowerBands:
                        lower.bandCount,

                    upperBands:
                        upper.bandCount
                }
            );
        }


        const lowerReferenceEnergy =
            Math.max(
                lower.energy,
                0
            );


        const upperReferenceEnergy =
            Math.max(
                upper.energy,
                0
            );


        if (
            lowerReferenceEnergy <=
            this.minimumBandEnergy
        ) {

            return unavailable(
                "insufficient-lower-energy",
                {
                    lowerBands:
                        lower.bandCount,

                    upperBands:
                        upper.bandCount
                }
            );
        }


        const upperToLowerRatio =
            upperReferenceEnergy /
            lowerReferenceEnergy;


        const upperToLowerDb =
            this.dbFromRatio(
                upperToLowerRatio
            );


        /*
         * Estabilidade:
         *
         * Se houver estabilidade real,
         * utilizamos.
         *
         * Se não houver, não fingimos.
         *
         * No Analyzer V0.7 atual:
         * estabilidade individual não existe.
         *
         * Portanto a confiança será baseada
         * em cobertura + confiança global.
         */

        let stability =
            0;


        let stabilityAvailable =
            false;


        if (
            upper.hasStability &&
            lower.hasStability
        ) {

            const upperStability =
                upper.stableBandCount /
                Math.max(
                    upper.bandCount,
                    1
                );


            const lowerStability =
                lower.stableBandCount /
                Math.max(
                    lower.bandCount,
                    1
                );


            stability =
                this.clamp(
                    (
                        upperStability *
                        0.70
                    ) +
                    (
                        lowerStability *
                        0.30
                    ),
                    0,
                    1
                );


            stabilityAvailable =
                true;
        }


        /*
         * Cobertura superior.
         */

        const upperCoverage =
            this.clamp(
                upper.bandCount /
                Math.max(
                    this.minimumUpperBands,
                    1
                ),
                0,
                1
            );


        /*
         * Confiança final da evidência.
         */

        const confidence =
            this.clamp(
                (
                    globalConfidence *
                    0.55
                ) +
                (
                    upperCoverage *
                    0.25
                ) +
                (
                    coverage.confidence *
                    0.20
                ),
                0,
                1
            );


        /*
         * Quando não existe estabilidade
         * individual, a confiança não pode
         * ultrapassar o limite conservador
         * para uma hipótese de reconstrução.
         */

        const effectiveConfidence =
            stabilityAvailable
                ? confidence
                : Math.min(
                    confidence,
                    0.82
                );


        // ----------------------------------
        // SCORE DE REDUÇÃO
        // ----------------------------------

        const ratioScore =
            this.clamp(
                (
                    this.upperContentObserveThreshold -
                    upperToLowerRatio
                ) /
                Math.max(
                    this.upperContentObserveThreshold,
                    0.0001
                ),
                0,
                1
            );


        const confidenceGate =
            this.clamp(
                effectiveConfidence /
                Math.max(
                    this.minimumUpperContentConfidence,
                    0.0001
                ),
                0,
                1
            );


        /*
         * Sem estabilidade individual:
         *
         * usamos somente cobertura e
         * confiança global.
         */

        const stabilityFactor =
            stabilityAvailable
                ? stability
                : 0.85;


        const score =
            this.clamp(
                ratioScore *
                confidenceGate *
                stabilityFactor,
                0,
                1
            );


        let status =
            "preserve";


        let bandwidthDeficiency =
            false;


        let reason =
            "upper-content-within-conservative-range";


        // ----------------------------------
        // CLASSIFICAÇÃO
        // ----------------------------------

        if (
            effectiveConfidence <
            this.minimumUpperContentConfidence
        ) {

            status =
                "preserve";


            reason =
                "insufficient-confidence";
        }


        else if (
            upperToLowerRatio <=
            this.minimumUpperToLowerRatio
        ) {

            /*
             * Mesmo uma razão muito baixa
             * precisa de cobertura superior.
             */

            if (
                upper.bandCount >=
                this.minimumUpperBands
            ) {

                status =
                    "candidate";


                bandwidthDeficiency =
                    true;


                reason =
                    "strong-upper-content-deficiency-evidence";

            } else {

                status =
                    "preserve";


                reason =
                    "insufficient-upper-coverage";
            }
        }


        else if (
            upperToLowerRatio <
            this.upperContentObserveThreshold
        ) {

            status =
                "observe";


            reason =
                "moderate-upper-content-reduction";
        }


        else {

            status =
                "preserve";


            reason =
                "upper-content-within-conservative-range";
        }


        /*
         * Proteção adicional:
         *
         * Não permitir "candidate" apenas
         * por energia baixa se a confiança
         * global estiver muito baixa.
         */

        if (
            status ===
            "candidate" &&
            effectiveConfidence <
            (
                this.minimumUpperContentConfidence +
                0.05
            )
        ) {

            status =
                "observe";


            bandwidthDeficiency =
                false;


            reason =
                "candidate-downgraded-by-confidence";
        }


        return {

            available:
                true,

            score,

            confidence:
                effectiveConfidence,

            lowerReferenceEnergy,

            upperReferenceEnergy,

            upperToLowerRatio,

            upperToLowerDb,

            stability,

            stabilityAvailable,

            bandwidthDeficiency,

            status,

            reason,

            bands: {

                lower:
                    lower.bandCount,

                upper:
                    upper.bandCount,

                stableLower:
                    lower.stableBandCount,

                stableUpper:
                    upper.stableBandCount
            },

            evidence: {

                measured:

                    "band-energy-ratio",

                inferred:

                    "upper-content-reduction",

                hypothesis:

                    status ===
                    "candidate"
                        ? "possible-bandwidth-deficiency"
                        : "none",

                indeterminate:

                    !stabilityAvailable
            }
        };
    }
        // ======================================
    // PERFIL DESCRITIVO DAS REGIÕES
    // ======================================
    //
    // Este método não decide processamento.
    //
    // Ele somente organiza as evidências
    // disponíveis para os consumidores.
    //
    // ======================================

    calculateRegionalProfile(
        analysis
    ) {

        if (
            !analysis
        ) {

            return {

                available:
                    false,

                regions:
                    {}
            };
        }


        const bands =
            this.getBandEntries(
                analysis
            );


        if (
            bands.length === 0
        ) {

            return {

                available:
                    false,

                regions:
                    {}
            };
        }


        const regions = {

            lower: {

                energy:
                    0,

                bands:
                    0
            },

            presence: {

                energy:
                    0,

                bands:
                    0
            },

            sibilance: {

                energy:
                    0,

                bands:
                    0
            },

            air: {

                energy:
                    0,

                bands:
                    0
            }
        };


        for (
            let i = 0;
            i < bands.length;
            i++
        ) {

            const band =
                bands[i];


            const frequency =
                this.safeNumber(
                    band.centerFrequency
                );


            const energy =
                Math.max(
                    0,
                    this.safeNumber(
                        band.energy
                    )
                );


            if (
                frequency >=
                700 &&
                frequency <
                2500
            ) {

                regions.lower.energy +=
                    energy;

                regions.lower.bands++;
            }


            else if (
                frequency >=
                2500 &&
                frequency <
                5000
            ) {

                regions.presence.energy +=
                    energy;

                regions.presence.bands++;
            }


            else if (
                frequency >=
                5000 &&
                frequency <
                9500
            ) {

                regions.sibilance.energy +=
                    energy;

                regions.sibilance.bands++;
            }


            else if (
                frequency >=
                9500 &&
                frequency <
                14000
            ) {

                regions.air.energy +=
                    energy;

                regions.air.bands++;
            }
        }


        const total =
            regions.lower.energy +
            regions.presence.energy +
            regions.sibilance.energy +
            regions.air.energy +
            0.000001;


        return {

            available:
                true,

            regions: {

                lower: {

                    energy:
                        regions.lower.energy,

                    ratio:
                        regions.lower.energy /
                        total,

                    bands:
                        regions.lower.bands
                },


                presence: {

                    energy:
                        regions.presence.energy,

                    ratio:
                        regions.presence.energy /
                        total,

                    bands:
                        regions.presence.bands
                },


                sibilance: {

                    energy:
                        regions.sibilance.energy,

                    ratio:
                        regions.sibilance.energy /
                        total,

                    bands:
                        regions.sibilance.bands
                },


                air: {

                    energy:
                        regions.air.energy,

                    ratio:
                        regions.air.energy /
                        total,

                    bands:
                        regions.air.bands
                }
            }
        };
    }


    // ======================================
    // INTERPRETAR TENDÊNCIA SUPERIOR
    // ======================================

    interpretUpperTendency(
        upperContentEvidence,
        tilt
    ) {

        if (
            !upperContentEvidence ||
            !upperContentEvidence.available
        ) {

            return {

                label:
                    "unknown",

                confidence:
                    0,

                reason:
                    "insufficient-upper-evidence"
            };
        }


        if (
            upperContentEvidence.status ===
            "candidate"
        ) {

            return {

                label:
                    "reduced-upper-content",

                confidence:
                    upperContentEvidence.confidence,

                reason:
                    upperContentEvidence.reason
            };
        }


        if (
            upperContentEvidence.status ===
            "observe"
        ) {

            return {

                label:
                    "possibly-reduced-upper-content",

                confidence:
                    upperContentEvidence.confidence,

                reason:
                    upperContentEvidence.reason
            };
        }


        if (
            tilt &&
            tilt.tilt <
            -0.35
        ) {

            return {

                label:
                    "lower-weighted-spectrum",

                confidence:
                    this.clamp(
                        Math.abs(
                            tilt.tilt
                        ),
                        0,
                        1
                    ),

                reason:
                    "lower-region-dominance"
            };
        }


        return {

            label:
                "upper-content-preserved",

            confidence:
                upperContentEvidence.confidence,

            reason:
                "upper-content-within-conservative-range"
        };
    }


    // ======================================
    // EVIDÊNCIA DE QUALIDADE ESPECTRAL
    // ======================================
    //
    // Separa:
    //
    // MEDIDA
    // INFERÊNCIA
    // HIPÓTESE
    // INDETERMINADO
    //
    // ======================================

    buildEvidenceSummary(
        analysis,
        tilt,
        upperContentEvidence
    ) {

        const regional =
            this.calculateRegionalProfile(
                analysis
            );


        const measured = {

            analysisConfidence:
                this.safeNumber(
                    analysis.confidence
                ),

            spectralTilt:
                tilt.tilt,

            lowerEnergy:
                upperContentEvidence
                    .lowerReferenceEnergy,

            upperEnergy:
                upperContentEvidence
                    .upperReferenceEnergy,

            upperToLowerRatio:
                upperContentEvidence
                    .upperToLowerRatio
        };


        const inferred = {

            upperContentStatus:
                upperContentEvidence
                    .status,

            upperContentTendency:
                this.interpretUpperTendency(
                    upperContentEvidence,
                    tilt
                )
                    .label
        };


        const hypothesis = {

            possibleBandwidthDeficiency:
                upperContentEvidence
                    .status ===
                "candidate"
        };


        const indeterminate = {

            individualBandStability:
                !upperContentEvidence
                    .stabilityAvailable,

            harmonicStructure:
                true,

            spectralFineStructure:
                true,

            trueBandwidthLimit:
                true
        };


        return {

            measured,

            inferred,

            hypothesis,

            indeterminate,

            regional
        };
    }
        // ======================================
    // GERAR PERFIL
    // ======================================

    analyze(
        analysis
    ) {

        if (
            !analysis
        ) {

            const invalidProfile = {

                version:
                    this.version,

                valid:
                    false,

                confidence:
                    0,

                decisionHints: {

                    preserveIfLowConfidence:
                        true,

                    preserveIfAmbiguous:
                        true,

                    preserveIfUpperEvidenceWeak:
                        true,

                    avoidAutomaticCorrection:
                        true,

                    reconstructionPermission:
                        "none"
                }
            };


            this.lastProfile =
                invalidProfile;


            return invalidProfile;
        }


        // ----------------------------------
        // CONFIANÇA
        // ----------------------------------

        const confidence =
            this.calculateConfidence(
                analysis
            );


        // ----------------------------------
        // COBERTURA
        // ----------------------------------

        const coverage =
            this.calculateCoverage(
                analysis
            );


        // ----------------------------------
        // BANDAS ESTÁVEIS
        // ----------------------------------
        //
        // Só contamos quando existe
        // estabilidade individual real.
        //
        // No Analyzer V0.7 atual:
        // provavelmente será 0.
        //
        // Isso é intencional.
        //
        // ----------------------------------

        const stableBands =
            this.countStableBands(
                analysis
            );


        const usableBands =
            this.countUsableBands(
                analysis
            );


        // ----------------------------------
        // REFERÊNCIAS
        // ----------------------------------

        const referenceNames = [
            "neutral",
            "warm",
            "bright"
        ];


        const references = {};


        for (
            let i = 0;
            i <
            referenceNames.length;
            i++
        ) {

            const name =
                referenceNames[i];


            const comparison =
                this.getComparison(
                    analysis,
                    name
                );


            references[name] =
                this.calculateReferenceDistance(
                    comparison
                );
        }


        // ----------------------------------
        // REFERÊNCIA MAIS PRÓXIMA
        // ----------------------------------

        const closest =
            this.determineClosestReference(
                references
            );


        // ----------------------------------
        // AMBIGUIDADE
        // ----------------------------------

        const separation =
            this.calculateReferenceSeparation(
                references,
                closest
            );


        // ----------------------------------
        // TENDÊNCIA
        // ----------------------------------

        const tendency =
            this.classifyTonalTendency(
                closest,
                separation,
                confidence
            );


        // ----------------------------------
        // INCLINAÇÃO
        // ----------------------------------

        const tilt =
            this.calculateSpectralTilt(
                analysis
            );


        // ----------------------------------
        // CONTEÚDO SUPERIOR
        // ----------------------------------

        const upperContentEvidence =
            this.calculateUpperContentEvidence(
                analysis
            );


        // ----------------------------------
        // PERFIL REGIONAL
        // ----------------------------------

        const regionalProfile =
            this.calculateRegionalProfile(
                analysis
            );


        // ----------------------------------
        // TENDÊNCIA SUPERIOR
        // ----------------------------------

        const upperTendency =
            this.interpretUpperTendency(
                upperContentEvidence,
                tilt
            );


        // ----------------------------------
        // EVIDÊNCIAS
        // ----------------------------------

        const evidence =
            this.buildEvidenceSummary(
                analysis,
                tilt,
                upperContentEvidence
            );


        // ----------------------------------
        // CONFIANÇA TONAL
        // ----------------------------------

        const tonalConfidence =
            this.clamp(
                tendency.confidence,
                0,
                1
            );


        // ----------------------------------
        // CONFIANÇA DE CONTEÚDO SUPERIOR
        // ----------------------------------

        const upperConfidence =
            this.clamp(
                upperContentEvidence.confidence,
                0,
                1
            );


        // ----------------------------------
        // DECISÕES CONSERVADORAS
        // ----------------------------------

        const lowConfidence =
            confidence <
            this.minimumConfidence;


        const ambiguous =
            separation.ambiguous;


        const weakUpperEvidence =
            !upperContentEvidence.available ||
            upperContentEvidence.status ===
            "preserve";


        /*
         * A reconstrução continua bloqueada.
         *
         * Este módulo apenas fornece
         * evidência.
         */

        const reconstructionPermission =
            "none";


        // ----------------------------------
        // RESULTADO
        // ----------------------------------

        const profile = {

            version:
                this.version,


            valid:
                true,


            confidence:
                confidence,


            coverage: {

                usableBands,

                totalBands:
                    coverage.totalBands,

                ratio:
                    coverage.coverage,

                confidence:
                    coverage.confidence,

                hasIndividualStability:
                    coverage.hasIndividualStability,

                stability:
                    coverage.stability
            },


            stableBands:


                stableBands,


            references:
                references,


            closestReference:
                closest
                    ? closest.name
                    : "unknown",


            referenceDistanceDb:
                closest
                    ? closest.distanceDb
                    : Infinity,


            weightedReferenceDistanceDb:
                closest
                    ? closest.weightedDistanceDb
                    : Infinity,


            referenceSeparationDb:
                separation.separationDb,


            ambiguous:
                ambiguous,


            tonalTendency:
                tendency.label,


            tonalConfidence:
                tonalConfidence,


            actionable:
                tendency.actionable,


            spectralTilt: {

                lowEnergy:
                    tilt.lowEnergy,

                highEnergy:
                    tilt.highEnergy,

                tilt:
                    tilt.tilt,

                lowerBandCount:
                    tilt.lowerBandCount,

                upperBandCount:
                    tilt.upperBandCount,

                confidence:
                    tilt.confidence
            },


            regionalProfile:
                regionalProfile,


            upperContentEvidence:
                upperContentEvidence,


            upperContentTendency:
                upperTendency,


            evidence:
                evidence,


            decisionHints: {

                preserveIfLowConfidence:
                    lowConfidence,

                preserveIfAmbiguous:
                    ambiguous,

                preserveIfUpperEvidenceWeak:
                    weakUpperEvidence,

                avoidAutomaticCorrection:
                    true,

                avoidBrighteningFromTiltAlone:
                    true,

                avoidReconstructionFromRatioAlone:
                    true,

                reconstructionPermission:
                    reconstructionPermission
            }
        };


        // ----------------------------------
        // GUARDAR ÚLTIMO PERFIL
        // ----------------------------------

        this.lastProfile =
            profile;


        return profile;
    }


    // ======================================
    // ALIAS
    // ======================================

    analyzeProfile(
        analysis
    ) {

        return this.analyze(
            analysis
        );
    }


    // ======================================
    // ÚLTIMO PERFIL
    // ======================================

    getLastProfile() {

        return this.lastProfile ||
            null;
    }
        // ======================================
    // PERFIL RESUMIDO
    // ======================================
    //
    // Útil para logs e consumidores que
    // não precisam do objeto completo.
    //
    // ======================================

    getSummary(
        profile = null
    ) {

        const current =
            profile ||
            this.lastProfile;


        if (
            !current
        ) {

            return {

                valid:
                    false,

                confidence:
                    0
            };
        }


        return {

            valid:
                current.valid,

            confidence:
                current.confidence,

            closestReference:
                current.closestReference,

            tonalTendency:
                current.tonalTendency,

            tonalConfidence:
                current.tonalConfidence,

            ambiguous:
                current.ambiguous,

            spectralTilt:
                current.spectralTilt
                    .tilt,

            upperContentStatus:
                current.upperContentEvidence
                    .status,

            upperContentConfidence:
                current.upperContentEvidence
                    .confidence,

            bandwidthDeficiency:
                current.upperContentEvidence
                    .bandwidthDeficiency,

            reconstructionPermission:
                current.decisionHints
                    .reconstructionPermission
        };
    }


    // ======================================
    // VALIDAR PERFIL
    // ======================================

    isUsable(
        profile = null
    ) {

        const current =
            profile ||
            this.lastProfile;


        if (
            !current ||
            current.valid !== true
        ) {

            return false;
        }


        return (
            current.confidence >=
            this.minimumConfidence
        );
    }


    // ======================================
    // VALIDAR EVIDÊNCIA SUPERIOR
    // ======================================

    hasUpperContentEvidence(
        profile = null
    ) {

        const current =
            profile ||
            this.lastProfile;


        if (
            !current ||
            !current.upperContentEvidence
        ) {

            return false;
        }


        return (
            current.upperContentEvidence
                .available === true
        );
    }


    // ======================================
    // VALIDAR CANDIDATO DE DEFICIÊNCIA
    // ======================================
    //
    // Isto NÃO autoriza reconstrução.
    //
    // Apenas informa que o perfil encontrou
    // evidência suficiente para uma etapa
    // posterior investigar o caso.
    //
    // ======================================

    hasBandwidthDeficiencyCandidate(
        profile = null
    ) {

        const current =
            profile ||
            this.lastProfile;


        if (
            !current ||
            !current.upperContentEvidence
        ) {

            return false;
        }


        return (
            current.upperContentEvidence
                .status ===
            "candidate" &&
            current.upperContentEvidence
                .bandwidthDeficiency ===
            true &&
            current.confidence >=
            this.minimumUpperContentConfidence
        );
    }


    // ======================================
    // PERMISSÃO DE RECONSTRUÇÃO
    // ======================================
    //
    // Mantida bloqueada nesta etapa.
    //
    // O objetivo é preparar evidência,
    // não executar reconstrução.
    //
    // ======================================

    getReconstructionPermission(
        profile = null
    ) {

        const current =
            profile ||
            this.lastProfile;


        if (
            !current ||
            !current.decisionHints
        ) {

            return "none";
        }


        return (
            current.decisionHints
                .reconstructionPermission
            ||
            "none"
        );
    }
        // ======================================
    // DIAGNÓSTICO TÉCNICO
    // ======================================
    //
    // Ajuda a identificar o que realmente
    // está disponível para interpretação.
    //
    // ======================================

    getDiagnostic(
        analysis = null,
        profile = null
    ) {

        const source =
            analysis;


        const current =
            profile ||
            this.lastProfile;


        if (
            !source &&
            !current
        ) {

            return {

                available:
                    false,

                reason:
                    "no-analysis"
            };
        }


        const coverage =
            source
                ? this.calculateCoverage(
                    source
                )
                : null;


        return {

            available:
                true,


            analyzerConfidence:
                source
                    ? this.safeNumber(
                        source.confidence
                    )
                    : null,


            usableBands:
                coverage
                    ? coverage.usableBands
                    : null,


            totalBands:
                coverage
                    ? coverage.totalBands
                    : null,


            coverageConfidence:
                coverage
                    ? coverage.confidence
                    : null,


            individualBandStability:
                coverage
                    ? coverage.hasIndividualStability
                    : null,


            stableBands:
                current
                    ? current.stableBands
                    : null,


            upperContentAvailable:
                current &&
                current.upperContentEvidence
                    ? current.upperContentEvidence
                        .available
                    : false,


            upperContentStatus:
                current &&
                current.upperContentEvidence
                    ? current.upperContentEvidence
                        .status
                    : "unknown",


            bandwidthDeficiency:
                current &&
                current.upperContentEvidence
                    ? current.upperContentEvidence
                        .bandwidthDeficiency
                    : false,


            reconstructionPermission:
                current &&
                current.decisionHints
                    ? current.decisionHints
                        .reconstructionPermission
                    : "none"
        };
    }
}


// ==========================================
// DISPONIBILIZAR GLOBALMENTE
// ==========================================

window.SpectralProfile =
    SpectralProfile;