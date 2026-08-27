// ==========================================
// SMOOTHVSTUDIO
// SPECTRAL PROFILE
// V0.2
// ==========================================
//
// Camada intermediária entre:
//
// SpectralBalancer
//        ↓
// SpectralProfile
//        ↓
// VocalTreatmentPlan
//
// RESPONSABILIDADE:
//
// Interpretar a análise espectral.
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
// Ele apenas transforma dados espectrais
// em informações de decisão.
//
// ==========================================


class SpectralProfile {


    constructor(options = {}) {


        // ==================================
        // CONFIGURAÇÃO
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
        // EVIDÊNCIA DE CONTEÚDO SUPERIOR
        // ==================================
        //
        // Estes parâmetros não comandam
        // nenhum processamento.
        //
        // Eles apenas controlam a confiança
        // da classificação espectral.
        //
        // ==================================

        this.minimumUpperContentConfidence =
            options.minimumUpperContentConfidence ??
            0.55;


        this.minimumUpperBands =
            options.minimumUpperBands ??
            2;


        this.upperContentObserveThreshold =
            options.upperContentObserveThreshold ??
            0.20;


        this.upperContentCandidateThreshold =
            options.upperContentCandidateThreshold ??
            0.08;


        this.version =
            "0.2";
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
    // VALOR ABSOLUTO SEGURO
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
    // ESTABILIDADE GLOBAL DO ANALYZER
    // ======================================
    //
    // O Analyzer atual fornece estabilidade
    // espectral global em:
    //
    // analysis.spectralAnalysis.stability
    //
    // Isso NÃO representa estabilidade
    // individual de cada banda.
    //
    // Portanto, esta informação não será
    // convertida artificialmente em
    // "N bandas estáveis".
    //
    // ======================================

    getGlobalSpectralStability(
        analysis
    ) {

        if (
            !analysis ||
            !analysis.spectralAnalysis
        ) {

            return null;
        }


        const stability =
            Number(
                analysis
                    .spectralAnalysis
                    .stability
            );


        if (
            !Number.isFinite(
                stability
            )
        ) {

            return null;
        }


        return this.clamp(
            stability,
            0,
            1
        );
    }


    // ======================================
    // CONTAR BANDAS ESTÁVEIS
    // ======================================

    countStableBands(
        analysis
    ) {

        if (
            !analysis
        ) {

            return 0;
        }


        // ----------------------------------
        // COMPATIBILIDADE COM FORMATO ANTIGO
        // ----------------------------------

        if (
            Array.isArray(
                analysis.bands
            )
        ) {

            let count =
                0;


            for (
                let i = 0;
                i < analysis.bands.length;
                i++
            ) {

                const stability =
                    this.safeNumber(
                        analysis
                            .bands[i]
                            .stability
                    );


                if (
                    stability >=
                    this.minimumConfidence
                ) {

                    count++;
                }
            }


            return count;
        }


        // ----------------------------------
        // FORMATO ATUAL DO ANALYZER
        // ----------------------------------
        //
        // As bandas atuais não carregam
        // estabilidade individual.
        //
        // Não transformar estabilidade
        // global em contagem artificial.
        //
        // ----------------------------------

        return 0;
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


        const stableBands =
            this.countStableBands(
                analysis
            );


        // ----------------------------------
        // FORMATO ANTIGO
        // ----------------------------------

        if (
            Array.isArray(
                analysis.bands
            )
        ) {

            const stableBandConfidence =
                this.clamp(
                    stableBands /
                    Math.max(
                        this.minimumStableBands,
                        1
                    ),
                    0,
                    1
                );


            return this.clamp(
                (
                    analysisConfidence *
                    0.65
                ) +
                (
                    stableBandConfidence *
                    0.35
                ),
                0,
                1
            );
        }


        // ----------------------------------
        // FORMATO ATUAL
        // ----------------------------------
        //
        // O Analyzer já fornece uma medida
        // global de estabilidade espectral.
        //
        // Ela pode contribuir para a confiança,
        // mas NÃO é convertida em quantidade
        // de bandas.
        //
        // ----------------------------------

        const globalStability =
            this.getGlobalSpectralStability(
                analysis
            );


        if (
            globalStability === null
        ) {

            return analysisConfidence;
        }


        return this.clamp(
            (
                analysisConfidence *
                0.65
            ) +
            (
                globalStability *
                0.35
            ),
            0,
            1
        );
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


            // ==================================
            // CORREÇÃO CONSERVADORA
            // ==================================
            //
            // Uma distância ausente ou inválida
            // não representa distância zero.
            //
            // Sem evidência válida, a banda não
            // participa da comparação.
            //
            // ==================================

            const rawDistance =
                band.distanceDb;


            if (
                !Number.isFinite(
                    Number(
                        rawDistance
                    )
                )
            ) {

                continue;
            }


            const distance =
                Number(
                    rawDistance
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
    // IDENTIFICAR REFERÊNCIA MAIS PRÓXIMA
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

    calculateSpectralTilt(
        analysis
    ) {

        if (
            !analysis
        ) {

            return {

                lowEnergy:
                    0,

                highEnergy:
                    0,

                tilt:
                    0
            };
        }


        // ----------------------------------
        // COMPATIBILIDADE COM FORMATO ANTIGO
        // ----------------------------------

        if (
            Array.isArray(
                analysis.bands
            )
        ) {

            if (
                analysis.bands.length === 0
            ) {

                return {

                    lowEnergy:
                        0,

                    highEnergy:
                        0,

                    tilt:
                        0
                };
            }


            let low =
                0;


            let high =
                0;


            let lowWeight =
                0;


            let highWeight =
                0;


            for (
                let i = 0;
                i < analysis.bands.length;
                i++
            ) {

                const band =
                    analysis.bands[i];


                const frequency =
                    this.safeNumber(
                        band.centerFrequency
                    );


                const energy =
                    Math.max(
                        0,
                        this.safeNumber(
                            band.spectrumShare
                        )
                    );


                const stability =
                    this.clamp(
                        this.safeNumber(
                            band.stability
                        ),
                        0,
                        1
                    );


                const weightedEnergy =
                    energy *
                    Math.max(
                        0.10,
                        stability
                    );


                if (
                    frequency <
                    700
                ) {

                    low +=
                        weightedEnergy;


                    lowWeight +=
                        Math.max(
                            0.10,
                            stability
                        );
                }


                else if (
                    frequency >=
                    3000
                ) {

                    high +=
                        weightedEnergy;


                    highWeight +=
                        Math.max(
                            0.10,
                            stability
                        );
                }
            }


            const lowEnergy =
                lowWeight > 0
                    ? low /
                      lowWeight
                    : 0;


            const highEnergy =
                highWeight > 0
                    ? high /
                      highWeight
                    : 0;


            return {

                lowEnergy,

                highEnergy,

                tilt:
                    highEnergy -
                    lowEnergy
            };
        }


        // ----------------------------------
        // FORMATO ATUAL DO ANALYZER
        // ----------------------------------
        //
        // As bandas são regiões nomeadas.
        //
        // Frequências centrais aproximadas
        // são usadas somente para classificar
        // as regiões no cálculo interno.
        //
        // Não são apresentadas como medições
        // FFT individuais.
        //
        // ----------------------------------

        if (
            !analysis.bands ||
            typeof analysis.bands !==
            "object"
        ) {

            return {

                lowEnergy:
                    0,

                highEnergy:
                    0,

                tilt:
                    0
            };
        }


        const bands =
            analysis.bands;


        const lowKeys = [
            "sub",
            "body",
            "lowMid"
        ];


        const highKeys = [
            "presence",
            "sibilance",
            "air"
        ];


        let lowEnergy =
            0;


        let highEnergy =
            0;


        for (
            let i = 0;
            i < lowKeys.length;
            i++
        ) {

            const value =
                Number(
                    bands[
                        lowKeys[i]
                    ]
                );


            if (
                Number.isFinite(
                    value
                )
            ) {

                lowEnergy +=
                    Math.max(
                        0,
                        value
                    );
            }
        }


        for (
            let i = 0;
            i < highKeys.length;
            i++
        ) {

            const value =
                Number(
                    bands[
                        highKeys[i]
                    ]
                );


            if (
                Number.isFinite(
                    value
                )
            ) {

                highEnergy +=
                    Math.max(
                        0,
                        value
                    );
            }
        }


        const total =
            lowEnergy +
            highEnergy +
            Math.max(
                0,
                this.safeNumber(
                    bands.mid
                )
            );


        if (
            total <= 0
        ) {

            return {

                lowEnergy:
                    0,

                highEnergy:
                    0,

                tilt:
                    0
            };
        }


        lowEnergy /=
            total;


        highEnergy /=
            total;


        return {

            lowEnergy,

            highEnergy,

            tilt:
                highEnergy -
                lowEnergy
        };
    }
        // ======================================
    // EVIDÊNCIA DE CONTEÚDO SUPERIOR
    // ======================================
    //
    // Esta análise NÃO determina EQ,
    // ganho ou reconstrução.
    //
    // Ela procura somente evidência de que
    // o conteúdo superior esteja reduzido
    // em relação ao conteúdo central.
    //
    // A análise usa as evidências já
    // produzidas pelo Analyzer.
    //
    // ======================================

    calculateUpperContentEvidence(
        analysis
    ) {

        const unavailable =
            (
                reason
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

                    stability:
                        0,

                    bandwidthDeficiency:
                        false,

                    status:
                        "preserve",

                    reason
                };
            };


        if (
            !analysis
        ) {

            return unavailable(
                "missing-analysis"
            );
        }


        // ----------------------------------
        // EVIDÊNCIA DIRETA DO ANALYZER
        // ----------------------------------
        //
        // O Analyzer atual já produz uma
        // análise superior específica.
        //
        // Quando disponível, ela tem
        // prioridade sobre a antiga tentativa
        // de reconstruir essa evidência a partir
        // de um array de bandas.
        //
        // ----------------------------------

        const spectralAnalysis =
            analysis.spectralAnalysis;


        if (
            spectralAnalysis &&
            typeof spectralAnalysis ===
            "object"
        ) {

            const ratio =
                Number(
                    spectralAnalysis
                        .upperToLowerRatio
                );


            const stability =
                Number(
                    spectralAnalysis
                        .stability
                );


            const bandwidthConfidence =
                Number(
                    spectralAnalysis
                        .bandwidthConfidence
                );


            const upperPresence =
                Number(
                    spectralAnalysis
                        .upperPresence
                );


            const hasRatio =
                Number.isFinite(
                    ratio
                );


            const hasStability =
                Number.isFinite(
                    stability
                );


            const hasBandwidthConfidence =
                Number.isFinite(
                    bandwidthConfidence
                );


            const hasUpperPresence =
                Number.isFinite(
                    upperPresence
                );


            if (
                hasRatio ||
                hasUpperPresence
            ) {

                const safeRatio =
                    hasRatio
                        ? Math.max(
                            0,
                            ratio
                        )
                        : 0;


                const safeStability =
                    hasStability
                        ? this.clamp(
                            stability,
                            0,
                            1
                        )
                        : 0;


                const globalConfidence =
                    this.clamp(
                        this.safeNumber(
                            analysis.confidence
                        ),
                        0,
                        1
                    );


                const safeBandwidthConfidence =
                    hasBandwidthConfidence
                        ? this.clamp(
                            bandwidthConfidence,
                            0,
                            1
                        )
                        : globalConfidence;


                const confidence =
                    this.clamp(
                        (
                            globalConfidence *
                            0.40
                        ) +
                        (
                            safeStability *
                            0.30
                        ) +
                        (
                            safeBandwidthConfidence *
                            0.30
                        ),
                        0,
                        1
                    );


                const ratioScore =
                    this.clamp(
                        (
                            this.upperContentObserveThreshold -
                            safeRatio
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
                        confidence /
                        Math.max(
                            this.minimumUpperContentConfidence,
                            0.0001
                        ),
                        0,
                        1
                    );


                const score =
                    this.clamp(
                        ratioScore *
                        confidenceGate *
                        (
                            hasStability
                                ? safeStability
                                : 1
                        ),
                        0,
                        1
                    );


                let status =
                    "preserve";


                let bandwidthDeficiency =
                    false;


                let reason =
                    "upper-content-within-conservative-range";


                if (
                    confidence <
                    this.minimumUpperContentConfidence
                ) {

                    status =
                        "preserve";


                    reason =
                        "insufficient-confidence";
                }


                else if (
                    hasStability &&
                    safeStability <
                    this.minimumConfidence
                ) {

                    status =
                        "preserve";


                    reason =
                        "insufficient-stability";
                }


                else if (
                    safeRatio <=
                    this.upperContentCandidateThreshold
                ) {

                    status =
                        "candidate";


                    bandwidthDeficiency =
                        true;


                    reason =
                        "strong-upper-content-deficiency-evidence";
                }


                else if (
                    safeRatio <
                    this.upperContentObserveThreshold
                ) {

                    status =
                        "observe";


                    reason =
                        "moderate-upper-content-reduction";
                }


                return {

                    available:
                        true,

                    score,

                    confidence,

                    lowerReferenceEnergy:
                        0,

                    upperReferenceEnergy:
                        Math.max(
                            0,
                            safeRatio
                        ),

                    upperToLowerRatio:
                        safeRatio,

                    stability:
                        safeStability,

                    bandwidthDeficiency,

                    status,

                    reason,

                    source:
                        "analyzer-spectral-analysis",

                    upperPresence:
                        hasUpperPresence
                            ? upperPresence
                            : null,

                    bandwidthConfidence:
                        hasBandwidthConfidence
                            ? safeBandwidthConfidence
                            : null
                };
            }
        }


        // ----------------------------------
        // COMPATIBILIDADE LEGADA
        // ----------------------------------
        //
        // Mantém o comportamento original
        // quando o Analyzer fornece o antigo
        // formato de array.
        //
        // ----------------------------------

        if (
            !Array.isArray(
                analysis.bands
            ) ||
            analysis.bands.length === 0
        ) {

            return unavailable(
                "insufficient-band-data"
            );
        }


        let lowerEnergy =
            0;


        let upperEnergy =
            0;


        let lowerWeight =
            0;


        let upperWeight =
            0;


        let upperBandCount =
            0;


        let stableUpperBands =
            0;


        let lowerBandCount =
            0;


        let stableLowerBands =
            0;


        // ----------------------------------
        // REGIÕES UTILIZADAS
        // ----------------------------------

        for (
            let i = 0;
            i < analysis.bands.length;
            i++
        ) {

            const band =
                analysis.bands[i];


            const frequency =
                this.safeNumber(
                    band.centerFrequency,
                    0
                );


            const energy =
                Math.max(
                    0,
                    this.safeNumber(
                        band.spectrumShare,
                        0
                    )
                );


            const stability =
                this.clamp(
                    this.safeNumber(
                        band.stability,
                        0
                    ),
                    0,
                    1
                );


            const weight =
                Math.max(
                    0.10,
                    stability
                );


            const weightedEnergy =
                energy *
                weight;


            if (
                frequency >= 700 &&
                frequency < 3000
            ) {

                lowerEnergy +=
                    weightedEnergy;


                lowerWeight +=
                    weight;


                lowerBandCount++;


                if (
                    stability >=
                    this.minimumConfidence
                ) {

                    stableLowerBands++;
                }
            }


            else if (
                frequency >= 3000 &&
                frequency < 12000
            ) {

                upperEnergy +=
                    weightedEnergy;


                upperWeight +=
                    weight;


                upperBandCount++;


                if (
                    stability >=
                    this.minimumConfidence
                ) {

                    stableUpperBands++;
                }
            }
        }
                if (
            lowerBandCount === 0 ||
            upperBandCount <
            this.minimumUpperBands
        ) {

            return unavailable(
                "insufficient-upper-band-coverage"
            );
        }


        if (
            lowerWeight <= 0 ||
            upperWeight <= 0
        ) {

            return unavailable(
                "insufficient-weighted-energy"
            );
        }


        const lowerReferenceEnergy =
            lowerEnergy /
            lowerWeight;


        const upperReferenceEnergy =
            upperEnergy /
            upperWeight;


        const upperToLowerRatio =
            lowerReferenceEnergy > 0
                ? upperReferenceEnergy /
                  lowerReferenceEnergy
                : 0;


        const upperStability =
            upperBandCount > 0
                ? stableUpperBands /
                  upperBandCount
                : 0;


        const lowerStability =
            lowerBandCount > 0
                ? stableLowerBands /
                  lowerBandCount
                : 0;


        const stability =
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


        const globalConfidence =
            this.calculateConfidence(
                analysis
            );


        const coverageConfidence =
            this.clamp(
                upperBandCount /
                Math.max(
                    this.minimumUpperBands,
                    1
                ),
                0,
                1
            );


        const confidence =
            this.clamp(
                (
                    globalConfidence *
                    0.50
                ) +
                (
                    stability *
                    0.30
                ) +
                (
                    coverageConfidence *
                    0.20
                ),
                0,
                1
            );


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
                confidence /
                Math.max(
                    this.minimumUpperContentConfidence,
                    0.0001
                ),
                0,
                1
            );


        const score =
            this.clamp(
                ratioScore *
                confidenceGate *
                stability,
                0,
                1
            );


        let status =
            "preserve";


        let bandwidthDeficiency =
            false;


        let reason =
            "upper-content-within-conservative-range";


        if (
            confidence <
            this.minimumUpperContentConfidence
        ) {

            status =
                "preserve";


            reason =
                "insufficient-confidence";
        }


        else if (
            stability <
            this.minimumConfidence
        ) {

            status =
                "preserve";


            reason =
                "insufficient-stability";
        }


        else if (
            upperToLowerRatio <=
            this.upperContentCandidateThreshold
        ) {

            status =
                "candidate";


            bandwidthDeficiency =
                true;


            reason =
                "strong-upper-content-deficiency-evidence";
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


        return {

            available:
                true,

            score,

            confidence,

            lowerReferenceEnergy,

            upperReferenceEnergy,

            upperToLowerRatio,

            stability,

            bandwidthDeficiency,

            status,

            reason,

            bands: {

                lower:
                    lowerBandCount,

                upper:
                    upperBandCount,

                stableLower:
                    stableLowerBands,

                stableUpper:
                    stableUpperBands
            }
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

            return {

                version:
                    this.version,

                valid:
                    false,

                confidence:
                    0
            };
        }


        // ----------------------------------
        // CONFIANÇA
        // ----------------------------------

        const confidence =
            this.calculateConfidence(
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
        // RESULTADO
        // ----------------------------------

        return {

            version:
                this.version,


            valid:
                true,


            confidence:
                confidence,


            stableBands:
                this.countStableBands(
                    analysis
                ),


            references:
                references,


            closestReference:
                closest
                    ? closest.name
                    : "unknown",


            referenceSeparationDb:
                separation.separationDb,


            ambiguous:
                separation.ambiguous,


            tonalTendency:
                tendency.label,


            tonalConfidence:
                tendency.confidence,


            actionable:
                tendency.actionable,


            spectralTilt:
                tilt,


            upperContentEvidence:
                upperContentEvidence,


            decisionHints: {

                preserveIfLowConfidence:
                    confidence <
                    this.minimumConfidence,

                preserveIfAmbiguous:
                    separation.ambiguous,

                preserveIfUpperEvidenceWeak:
                    !upperContentEvidence.available ||
                    upperContentEvidence.status ===
                    "preserve",

                avoidAutomaticCorrection:
                    true,

                reconstructionPermission:
                    "none"
            }
        };
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
}


// ==========================================
// DISPONIBILIZAR GLOBALMENTE
// ==========================================

window.SpectralProfile =
    SpectralProfile;