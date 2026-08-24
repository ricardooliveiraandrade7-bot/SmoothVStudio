// ==========================================
// SMOOTHVSTUDIO
// VOCAL SATURATION
// V1.0
// ==========================================
//
// Executor DSP dedicado à reconstrução
// harmônica vocal moderada.
//
// OBJETIVO:
//
// - adicionar reconstrução harmônica sutil;
// - preservar identidade vocal;
// - preservar dinâmica;
// - evitar distorção audível;
// - evitar brilho artificial;
// - trabalhar de forma regional;
// - adaptar a intensidade ao material analisado.
//
// REGIÕES:
//
// 1. GRAVES
// 2. MÉDIO-GRAVES
// 3. MÉDIOS
// 4. MÉDIO-AGUDOS
// 5. AGUDOS
//
// IMPORTANTE:
//
// Este módulo NÃO contém inteligência.
//
// Ele não:
// - cria decisões;
// - consulta TreatmentPlan;
// - consulta DecisionPipeline;
// - altera Body;
// - altera Tone;
// - altera Dynamics;
// - altera Harshness;
// - altera Sibilance.
//
// Ele recebe somente:
// - OfflineAudioContext;
// - análise já existente.
//
// ==========================================


class VocalSaturation {


    constructor(
        options = {}
    ) {


        this.version =
            "1.0";


        // ==================================
        // LIMITES GERAIS
        // ==================================

        this.maxDrive =
            Number.isFinite(
                options.maxDrive
            )
                ? options.maxDrive
                : 0.16;


        this.maxMix =
            Number.isFinite(
                options.maxMix
            )
                ? options.maxMix
                : 0.18;


        this.outputTrim =
            Number.isFinite(
                options.outputTrim
            )
                ? options.outputTrim
                : 0.985;


        // ==================================
        // REGIÕES
        // ==================================

        this.regions = {

            low: {

                name:
                    "low",

                minFrequency:
                    35,

                maxFrequency:
                    110,

                drive:
                    0.055,

                mix:
                    0.080
            },


            lowMid: {

                name:
                    "lowMid",

                minFrequency:
                    110,

                maxFrequency:
                    320,

                drive:
                    0.065,

                mix:
                    0.090
            },


            mid: {

                name:
                    "mid",

                minFrequency:
                    320,

                maxFrequency:
                    1200,

                drive:
                    0.075,

                mix:
                    0.100
            },


            highMid: {

                name:
                    "highMid",

                minFrequency:
                    1200,

                maxFrequency:
                    4200,

                drive:
                    0.060,

                mix:
                    0.085
            },


            high: {

                name:
                    "high",

                minFrequency:
                    4200,

                maxFrequency:
                    12000,

                drive:
                    0.035,

                mix:
                    0.050
            }
        };


        // ==================================
        // ÚLTIMA CONFIGURAÇÃO
        // ==================================

        this.lastSettings =
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

        return Number.isFinite(
            value
        )
            ? value
            : fallback;
    }


    // ======================================
    // DETECTAR SAMPLE RATE
    // ======================================

    resolveSampleRate(
        context
    ) {

        return this.safeNumber(
            context &&
            context.sampleRate,
            48000
        );
    }


    // ======================================
    // LIMITAR FREQUÊNCIA
    // ======================================

    clampFrequency(
        frequency,
        sampleRate
    ) {

        const nyquist =
            sampleRate *
            0.5;

        return this.clamp(
            frequency,
            20,
            nyquist *
            0.92
        );
    }
        // ======================================
    // LER POSSÍVEL RMS DA ANÁLISE
    // ======================================

    resolveAnalysisLevel(
        analysis
    ) {

        if (
            !analysis ||
            typeof analysis !==
            "object"
        ) {

            return 0.35;
        }


        const candidates = [

            analysis.rms,

            analysis.RMS,

            analysis.level,

            analysis.energy,

            analysis.signalLevel,

            analysis.averageLevel
        ];


        for (
            const candidate of candidates
        ) {

            if (
                Number.isFinite(
                    candidate
                )
            ) {

                if (
                    candidate >= 0 &&
                    candidate <= 1
                ) {

                    return candidate;
                }


                if (
                    candidate < 0
                ) {

                    const linear =
                        Math.pow(
                            10,
                            candidate /
                            20
                        );


                    return this.clamp(
                        linear,
                        0,
                        1
                    );
                }
            }
        }


        return 0.35;
    }


    // ======================================
    // ADAPTAÇÃO GLOBAL
    // ======================================

    calculateAdaptation(
        analysis
    ) {

        const level =
            this.resolveAnalysisLevel(
                analysis
            );


        /*
         * A saturação aumenta apenas
         * moderadamente quando o material
         * apresenta nível muito baixo.
         *
         * Isso evita que sinais muito baixos
         * recebam uma quantidade excessiva
         * de reconstrução.
         */


        const normalized =
            this.clamp(
                level,
                0.05,
                0.85
            );


        const adaptation =
            1 -
            (
                normalized *
                0.32
            );


        return this.clamp(
            adaptation,
            0.70,
            0.98
        );
    }


    // ======================================
    // CURVA DE SATURAÇÃO SUAVE
    // ======================================

    createSaturationCurve(
        drive = 0.08
    ) {

        const samples =
            2048;


        const curve =
            new Float32Array(
                samples
            );


        const safeDrive =
            this.clamp(
                drive,
                0,
                this.maxDrive
            );


        /*
         * Curva arctan normalizada.
         *
         * A função cresce de maneira suave
         * e evita o comportamento agressivo
         * de um hard clip.
         */

        const amount =
            1 +
            (
                safeDrive *
                8
            );


        const normalization =
            Math.atan(
                amount
            );


        for (
            let i = 0;
            i < samples;
            i++
        ) {

            const x =
                (
                    i /
                    (
                        samples -
                        1
                    )
                ) *
                2 -
                1;


            const shaped =
                Math.atan(
                    x *
                    amount
                ) /
                normalization;


            /*
             * Mistura parcial entre o sinal
             * original e a curva.
             *
             * A função Waveshaper recebe
             * posteriormente um mix regional,
             * portanto a curva permanece
             * relativamente suave.
             */

            curve[i] =
                shaped;
        }


        return curve;
    }


    // ======================================
    // CRIAR WAVESHAPER
    // ======================================

    createShaper(
        context,
        drive
    ) {

        const shaper =
            context.createWaveShaper();


        shaper.curve =
            this.createSaturationCurve(
                drive
            );


        shaper.oversample =
            "2x";


        return shaper;
    }


    // ======================================
    // CRIAR FILTRO REGIONAL
    // ======================================

    createBandpass(
        context,
        minFrequency,
        maxFrequency
    ) {

        const filter =
            context.createBiquadFilter();


        filter.type =
            "bandpass";


        const center =
            Math.sqrt(
                minFrequency *
                maxFrequency
            );


        filter.frequency.value =
            this.clampFrequency(
                center,
                this.resolveSampleRate(
                    context
                )
            );


        const bandwidth =
            Math.log2(
                maxFrequency /
                minFrequency
            );


        filter.Q.value =
            this.clamp(
                1 /
                bandwidth,
                0.20,
                1.40
            );


        return filter;
    }
        // ======================================
    // CRIAR GANHO REGIONAL
    // ======================================

    createGain(
        context,
        value = 1
    ) {

        const gain =
            context.createGain();


        gain.gain.value =
            this.clamp(
                value,
                0,
                2
            );


        return gain;
    }


    // ======================================
    // CALCULAR CONFIGURAÇÃO REGIONAL
    // ======================================

    calculateRegionSettings(
        region,
        adaptation
    ) {

        const baseDrive =
            this.safeNumber(
                region.drive,
                0.05
            );


        const baseMix =
            this.safeNumber(
                region.mix,
                0.08
            );


        const drive =
            this.clamp(
                baseDrive *
                adaptation,
                0,
                this.maxDrive
            );


        const mix =
            this.clamp(
                baseMix *
                adaptation,
                0,
                this.maxMix
            );


        return {

            name:
                region.name,

            minFrequency:
                region.minFrequency,

            maxFrequency:
                region.maxFrequency,

            drive,

            mix
        };
    }


    // ======================================
    // CONSTRUIR REGIÃO
    // ======================================

    createRegion(
        context,
        region,
        adaptation
    ) {

        const settings =
            this.calculateRegionSettings(
                region,
                adaptation
            );


        const input =
            context.createGain();


        const bandpass =
            this.createBandpass(
                context,
                settings.minFrequency,
                settings.maxFrequency
            );


        const shaper =
            this.createShaper(
                context,
                settings.drive
            );


        const saturatedGain =
            this.createGain(
                context,
                settings.mix
            );


        /*
         * Caminho saturado:
         *
         * input
         *   ↓
         * bandpass
         *   ↓
         * shaper
         *   ↓
         * saturatedGain
         */


        input.connect(
            bandpass
        );


        bandpass.connect(
            shaper
        );


        shaper.connect(
            saturatedGain
        );


        return {

            input,

            output:
                saturatedGain,

            settings
        };
    }


    // ======================================
    // REGIÕES ATIVAS
    // ======================================

    getActiveRegions() {

        return [

            this.regions.low,

            this.regions.lowMid,

            this.regions.mid,

            this.regions.highMid,

            this.regions.high
        ];
    }


    // ======================================
    // GANHO DE COMPENSAÇÃO
    // ======================================

    calculateCompensation(
        regionSettings
    ) {

        let totalMix =
            0;


        for (
            const settings
            of regionSettings
        ) {

            totalMix +=
                settings.mix;
        }


        /*
         * Como o processamento é paralelo,
         * o ganho adicional precisa permanecer
         * extremamente pequeno.
         *
         * A compensação aqui não pretende
         * igualar loudness automaticamente.
         *
         * Ela apenas evita uma elevação
         * desnecessária do nível médio.
         */

        const compensation =
            1 -
            (
                totalMix *
                0.055
            );


        return this.clamp(
            compensation,
            0.94,
            1
        );
    }


    // ======================================
    // CONFIGURAÇÃO COMPLETA
    // ======================================

    calculateSettings(
        analysis
    ) {

        const adaptation =
            this.calculateAdaptation(
                analysis
            );


        const regionSettings =
            this.getActiveRegions()
                .map(
                    region =>
                        this.calculateRegionSettings(
                            region,
                            adaptation
                        )
                );


        const compensation =
            this.calculateCompensation(
                regionSettings
            );


        return {

            version:
                this.version,

            adaptation,

            compensation,

            maxDrive:
                this.maxDrive,

            maxMix:
                this.maxMix,

            regions:
                regionSettings
        };
    }
        // ======================================
    // CRIAR PROCESSADOR
    // ======================================

    createProcessor(
        context,
        analysis
    ) {

        if (
            !context
        ) {

            throw new Error(
                "VocalSaturation requer um AudioContext."
            );
        }


        if (
            typeof context.createGain !==
            "function"
        ) {

            throw new Error(
                "Contexto de áudio inválido para VocalSaturation."
            );
        }


        const settings =
            this.calculateSettings(
                analysis
            );


        this.lastSettings =
            settings;


        // ==================================
        // ENTRADA PRINCIPAL
        // ==================================

        const input =
            context.createGain();


        input.gain.value =
            1;


        // ==================================
        // SAÍDA PRINCIPAL
        // ==================================

        const output =
            context.createGain();


        output.gain.value =
            this.clamp(
                settings.compensation *
                this.outputTrim,
                0,
                1
            );


        // ==================================
        // SOMA REGIONAL
        // ==================================

        const regionalBus =
            context.createGain();


        regionalBus.gain.value =
            1;


        // ==================================
        // CONSTRUIR REGIÕES
        // ==================================

        const regionProcessors =
            [];


        for (
            const regionSettings
            of settings.regions
        ) {

            const processor =
                this.createRegion(
                    context,
                    regionSettings,
                    1
                );


            regionProcessors.push(
                processor
            );


            /*
             * A entrada principal alimenta
             * cada região em paralelo.
             */

            input.connect(
                processor.input
            );


            processor.output.connect(
                regionalBus
            );
        }


        // ==================================
        // SAÍDA
        // ==================================

        regionalBus.connect(
            output
        );


        return {

            input,

            output,

            settings,

            regions:
                regionProcessors
        };
    }


    // ======================================
    // ÚLTIMA CONFIGURAÇÃO
    // ======================================

    getLastSettings() {

        if (
            !this.lastSettings
        ) {

            return null;
        }


        return {

            ...this.lastSettings,

            regions:
                this.lastSettings.regions
                    ? this.lastSettings.regions.map(
                        region => ({
                            ...region
                        })
                    )
                    : []
        };
    }


    // ======================================
    // RESET
    // ======================================

    reset() {

        this.lastSettings =
            null;
    }
        // ======================================
    // ATUALIZAR PARÂMETROS DE UMA REGIÃO
    // ======================================
    //
    // Este método não processa áudio.
    //
    // Ele apenas permite que uma configuração
    // externa autorizada altere os limites
    // locais do executor.
    //
    // Não é utilizado pela inteligência.
    //
    // ======================================

    setRegion(
        regionName,
        options = {}
    ) {

        if (
            !this.regions[regionName]
        ) {

            return false;
        }


        const region =
            this.regions[regionName];


        if (
            Number.isFinite(
                options.minFrequency
            )
        ) {

            region.minFrequency =
                this.clamp(
                    options.minFrequency,
                    20,
                    18000
                );
        }


        if (
            Number.isFinite(
                options.maxFrequency
            )
        ) {

            region.maxFrequency =
                this.clamp(
                    options.maxFrequency,
                    region.minFrequency +
                    10,
                    20000
                );
        }


        if (
            Number.isFinite(
                options.drive
            )
        ) {

            region.drive =
                this.clamp(
                    options.drive,
                    0,
                    this.maxDrive
                );
        }


        if (
            Number.isFinite(
                options.mix
            )
        ) {

            region.mix =
                this.clamp(
                    options.mix,
                    0,
                    this.maxMix
                );
        }


        return true;
    }


    // ======================================
    // DESATIVAR REGIÃO
    // ======================================

    disableRegion(
        regionName
    ) {

        if (
            !this.regions[regionName]
        ) {

            return false;
        }


        this.regions[regionName]
            .drive =
            0;


        this.regions[regionName]
            .mix =
            0;


        return true;
    }


    // ======================================
    // RESTAURAR REGIÕES PADRÃO
    // ======================================

    resetRegions() {

        this.regions = {

            low: {

                name:
                    "low",

                minFrequency:
                    35,

                maxFrequency:
                    110,

                drive:
                    0.055,

                mix:
                    0.080
            },


            lowMid: {

                name:
                    "lowMid",

                minFrequency:
                    110,

                maxFrequency:
                    320,

                drive:
                    0.065,

                mix:
                    0.090
            },


            mid: {

                name:
                    "mid",

                minFrequency:
                    320,

                maxFrequency:
                    1200,

                drive:
                    0.075,

                mix:
                    0.100
            },


            highMid: {

                name:
                    "highMid",

                minFrequency:
                    1200,

                maxFrequency:
                    4200,

                drive:
                    0.060,

                mix:
                    0.085
            },


            high: {

                name:
                    "high",

                minFrequency:
                    4200,

                maxFrequency:
                    12000,

                drive:
                    0.035,

                mix:
                    0.050
            }
        };
    }


    // ======================================
    // CONFIGURAÇÃO CONSERVADORA
    // ======================================

    setConservativeMode() {

        this.maxDrive =
            0.10;


        this.maxMix =
            0.12;


        this.outputTrim =
            0.99;


        this.regions.low.drive =
            0.035;


        this.regions.low.mix =
            0.055;


        this.regions.lowMid.drive =
            0.040;


        this.regions.lowMid.mix =
            0.060;


        this.regions.mid.drive =
            0.045;


        this.regions.mid.mix =
            0.065;


        this.regions.highMid.drive =
            0.035;


        this.regions.highMid.mix =
            0.050;


        this.regions.high.drive =
            0.020;


        this.regions.high.mix =
            0.030;
    }
        // ======================================
    // CONFIGURAÇÃO PADRÃO
    // ======================================

    setDefaultMode() {

        this.maxDrive =
            0.16;


        this.maxMix =
            0.18;


        this.outputTrim =
            0.985;


        this.resetRegions();
    }


    // ======================================
    // DIAGNÓSTICO LOCAL
    // ======================================
    //
    // Apenas retorna os parâmetros atuais.
    //
    // Não processa áudio.
    // Não altera análise.
    // Não altera inteligência.
    //
    // ======================================

    getDiagnosticSnapshot() {

        return {

            version:
                this.version,

            maxDrive:
                this.maxDrive,

            maxMix:
                this.maxMix,

            outputTrim:
                this.outputTrim,

            regions: {

                low:
                    {
                        ...this.regions.low
                    },

                lowMid:
                    {
                        ...this.regions.lowMid
                    },

                mid:
                    {
                        ...this.regions.mid
                    },

                highMid:
                    {
                        ...this.regions.highMid
                    },

                high:
                    {
                        ...this.regions.high
                    }
            }
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

    window.VocalSaturation =
        VocalSaturation;
}