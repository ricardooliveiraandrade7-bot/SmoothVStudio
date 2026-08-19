// ==========================================
// SMOOTHVSTUDIO
// SPECTRAL BALANCER
// V0.2
// ==========================================
//
// ETAPA 2:
// REFERÊNCIAS ESPECTRAIS
//
// Este módulo continua sendo ANALÍTICO.
//
// NÃO aplica EQ.
// NÃO cria filtros.
// NÃO modifica AudioBuffer.
// NÃO altera o caminho DSP.
// NÃO transforma Warm/Bright/Neutral
// em presets de equalização.
//
// As três curvas são MODELOS DE
// REFERÊNCIA TONAL.
//
// Objetivo:
//
// 1. medir aproximadamente 20 regiões;
// 2. normalizar cada região em relação
//    ao loudness de banda larga;
// 3. representar três tendências tonais:
//
//       Neutral
//       Warm
//       Bright
//
// 4. fornecer uma zona de tolerância;
// 5. preparar o terreno para que o
//    VocalTreatmentPlan decida futuramente
//    se alguma correção é realmente necessária.
//
// IMPORTANTE:
//
// As curvas NÃO significam:
//
// "aplique estes ganhos".
//
// Elas significam:
//
// "este é o comportamento espectral
// de referência que estamos usando
// para avaliar a gravação".
//
// ==========================================


class SpectralBalancer {


    constructor(options = {}) {


        // ==================================
        // CONFIGURAÇÃO
        // ==================================

        this.bandCount =
            options.bandCount ||
            20;


        this.minFrequency =
            options.minFrequency ||
            45;


        this.maxFrequency =
            options.maxFrequency ||
            16000;


        this.fftSize =
            options.fftSize ||
            2048;


        this.hopSize =
            options.hopSize ||
            Math.floor(
                this.fftSize / 2
            );


        this.maxFrames =
            options.maxFrames ||
            180;


        this.minConfidence =
            options.minConfidence ??
            0.15;


        // ==================================
        // TOLERÂNCIA DAS REFERÊNCIAS
        // ==================================
        //
        // Não é um limite de EQ.
        //
        // É a distância espectral que
        // consideramos aceitável antes de
        // uma futura decisão de tratamento.
        //
        // ==================================

        this.referenceToleranceDb =
            options.referenceToleranceDb ??
            1.25;


        // ==================================
        // ESTADO
        // ==================================

        this.lastAnalysis =
            null;


        // ==================================
        // BANDAS
        // ==================================

        this.bands =
            this.createBands();


        // ==================================
        // REFERÊNCIAS
        // ==================================

        this.references =
            this.createReferences();
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
    // AMPLITUDE → DB
    // ======================================

    amplitudeToDb(
        amplitude
    ) {

        if (
            !Number.isFinite(
                amplitude
            ) ||
            amplitude <= 0
        ) {

            return -120;
        }


        return 20 *
            Math.log10(
                amplitude
            );
    }


    // ======================================
    // DB → AMPLITUDE
    // ======================================

    dbToAmplitude(
        db
    ) {

        return Math.pow(
            10,
            db / 20
        );
    }


    // ======================================
    // CRIAR BANDAS
    // ======================================
    //
    // As bandas são logarítmicas.
    //
    // Elas representam regiões de
    // observação, não filtros.
    //
    // ======================================

    createBands() {

        const bands =
            [];


        const min =
            Math.max(
                20,
                this.minFrequency
            );


        const max =
            Math.max(
                min * 2,
                this.maxFrequency
            );


        for (
            let i = 0;
            i < this.bandCount;
            i++
        ) {

            const startRatio =
                i /
                this.bandCount;


            const endRatio =
                (
                    i + 1
                ) /
                this.bandCount;


            const low =
                min *
                Math.pow(
                    max / min,
                    startRatio
                );


            const high =
                min *
                Math.pow(
                    max / min,
                    endRatio
                );


            const center =
                Math.sqrt(
                    low *
                    high
                );


            bands.push({

                index:
                    i,

                lowFrequency:
                    low,

                highFrequency:
                    high,

                centerFrequency:
                    center
            });
        }


        return bands;
    }


    // ======================================
    // REFERÊNCIAS TONais
    // ======================================
    //
    // Os valores representam tendência
    // espectral relativa em dB.
    //
    // NÃO são ganhos de EQ.
    //
    // A referência Neutral é a linha
    // central.
    //
    // Warm e Bright representam pequenas
    // inclinações tonais em torno dela.
    //
    // Os valores são interpolados entre
    // pontos de frequência.
    //
    // ======================================

    createReferences() {


        const referencePoints = {

            neutral: [

                [45,   0.00],
                [80,   0.00],
                [140,  0.00],
                [250,  0.00],
                [400,  0.00],
                [700,  0.00],
                [1000, 0.00],
                [1800, 0.00],
                [3000, 0.00],
                [5000, 0.00],
                [8000, 0.00],
                [12000, 0.00],
                [16000, 0.00]

            ],


            warm: [

                [45,   0.30],
                [80,   0.55],
                [140,  0.65],
                [250,  0.60],
                [400,  0.45],
                [700,  0.25],
                [1000, 0.10],
                [1800, 0.00],
                [3000, -0.10],
                [5000, -0.25],
                [8000, -0.45],
                [12000, -0.60],
                [16000, -0.70]

            ],


            bright: [

                [45,   -0.30],
                [80,   -0.30],
                [140,  -0.20],
                [250,  -0.10],
                [400,  0.00],
                [700,  0.05],
                [1000, 0.10],
                [1800, 0.20],
                [3000, 0.35],
                [5000, 0.50],
                [8000, 0.65],
                [12000, 0.75],
                [16000, 0.80]

            ]
        };


        return {

            neutral:
                this.buildReferenceCurve(
                    referencePoints.neutral
                ),

            warm:
                this.buildReferenceCurve(
                    referencePoints.warm
                ),

            bright:
                this.buildReferenceCurve(
                    referencePoints.bright
                )
        };
    }


    // ======================================
    // INTERPOLAR CURVA
    // ======================================

    interpolateReference(
        points,
        frequency
    ) {

        if (
            !points ||
            points.length === 0
        ) {

            return 0;
        }


        if (
            frequency <=
            points[0][0]
        ) {

            return points[0][1];
        }


        const last =
            points.length - 1;


        if (
            frequency >=
            points[last][0]
        ) {

            return points[last][1];
        }


        for (
            let i = 0;
            i < last;
            i++
        ) {

            const low =
                points[i];


            const high =
                points[i + 1];


            if (
                frequency >=
                low[0] &&
                frequency <=
                high[0]
            ) {

                const range =
                    high[0] -
                    low[0];


                const position =
                    range > 0
                        ? (
                            frequency -
                            low[0]
                        ) /
                        range
                        : 0;


                return (
                    low[1] +
                    (
                        high[1] -
                        low[1]
                    ) *
                    position
                );
            }
        }


        return 0;
    }


    // ======================================
    // GERAR CURVA NAS 20 BANDAS
    // ======================================

    buildReferenceCurve(
        points
    ) {

        const curve =
            [];


        for (
            let i = 0;
            i < this.bands.length;
            i++
        ) {

            const band =
                this.bands[i];


            curve.push({

                index:
                    band.index,

                frequency:
                    band.centerFrequency,

                valueDb:
                    this.interpolateReference(
                        points,
                        band.centerFrequency
                    )
            });
        }


        return curve;
    }


    // ======================================
    // MONO
    // ======================================

    createMonoBuffer(
        audioBuffer
    ) {

        const length =
            audioBuffer.length;


        const channels =
            audioBuffer.numberOfChannels;


        const mono =
            new Float32Array(
                length
            );


        if (
            channels <= 0
        ) {

            return mono;
        }


        const inverseChannels =
            1 /
            channels;


        for (
            let channel = 0;
            channel < channels;
            channel++
        ) {

            const data =
                audioBuffer.getChannelData(
                    channel
                );


            for (
                let i = 0;
                i < length;
                i++
            ) {

                mono[i] +=
                    data[i] *
                    inverseChannels;
            }
        }


        return mono;
    }


    // ======================================
    // JANELA HANN
    // ======================================

    createHannWindow(
        size
    ) {

        const window =
            new Float32Array(
                size
            );


        const denominator =
            Math.max(
                1,
                size - 1
            );


        for (
            let i = 0;
            i < size;
            i++
        ) {

            window[i] =
                0.5 *
                (
                    1 -
                    Math.cos(
                        (
                            2 *
                            Math.PI *
                            i
                        ) /
                        denominator
                    )
                );
        }


        return window;
    }


    // ======================================
    // FFT
    // ======================================

    fft(
        real,
        imag
    ) {

        const n =
            real.length;


        let j =
            0;


        // ----------------------------------
        // BIT REVERSAL
        // ----------------------------------

        for (
            let i = 1;
            i < n;
            i++
        ) {

            let bit =
                n >> 1;


            while (
                j & bit
            ) {

                j ^=
                    bit;

                bit >>=
                    1;
            }


            j ^=
                bit;


            if (
                i < j
            ) {

                const realTemp =
                    real[i];


                real[i] =
                    real[j];


                real[j] =
                    realTemp;


                const imagTemp =
                    imag[i];


                imag[i] =
                    imag[j];


                imag[j] =
                    imagTemp;
            }
        }


        // ----------------------------------
        // ESTÁGIOS
        // ----------------------------------

        for (
            let length = 2;
            length <= n;
            length <<= 1
        ) {

            const half =
                length >> 1;


            const angleStep =
                -(
                    2 *
                    Math.PI
                ) /
                length;


            const phaseReal =
                Math.cos(
                    angleStep
                );


            const phaseImag =
                Math.sin(
                    angleStep
                );


            let currentReal =
                1;


            let currentImag =
                0;


            for (
                let i = 0;
                i < half;
                i++
            ) {

                for (
                    let start = i;
                    start < n;
                    start += length
                ) {

                    const even =
                        start;


                    const odd =
                        start +
                        half;


                    const oddReal =
                        real[odd];


                    const oddImag =
                        imag[odd];


                    const transformedReal =
                        (
                            oddReal *
                            currentReal
                        ) -
                        (
                            oddImag *
                            currentImag
                        );


                    const transformedImag =
                        (
                            oddReal *
                            currentImag
                        ) +
                        (
                            oddImag *
                            currentReal
                        );


                    const evenReal =
                        real[even];


                    const evenImag =
                        imag[even];


                    real[even] =
                        evenReal +
                        transformedReal;


                    imag[even] =
                        evenImag +
                        transformedImag;


                    real[odd] =
                        evenReal -
                        transformedReal;


                    imag[odd] =
                        evenImag -
                        transformedImag;
                }


                const nextReal =
                    (
                        currentReal *
                        phaseReal
                    ) -
                    (
                        currentImag *
                        phaseImag
                    );


                const nextImag =
                    (
                        currentReal *
                        phaseImag
                    ) +
                    (
                        currentImag *
                        phaseReal
                    );


                currentReal =
                    nextReal;


                currentImag =
                    nextImag;
            }
        }


        return {

            real,

            imag
        };
    }


    // ======================================
    // VALIDAR FFT
    // ======================================

    isValidFFTSize(
        size
    ) {

        if (
            !Number.isInteger(
                size
            ) ||
            size < 256
        ) {

            return false;
        }


        return (
            size &
            (
                size - 1
            )
        ) === 0;
    }


    // ======================================
    // RESOLVER FFT
    // ======================================

    resolveFFTSize() {

        if (
            this.isValidFFTSize(
                this.fftSize
            )
        ) {

            return this.fftSize;
        }


        return 2048;
    }


    // ======================================
    // ESPECTRO
    // ======================================

    calculateSpectrum(
        real,
        imag
    ) {

        const size =
            real.length;


        const half =
            Math.floor(
                size / 2
            );


        const spectrum =
            new Float32Array(
                half + 1
            );


        const normalization =
            1 /
            size;


        for (
            let i = 0;
            i <= half;
            i++
        ) {

            const re =
                real[i] *
                normalization;


            const im =
                imag[i] *
                normalization;


            spectrum[i] =
                Math.sqrt(
                    (
                        re *
                        re
                    ) +
                    (
                        im *
                        im
                    )
                );
        }


        return spectrum;
    }


    // ======================================
    // ENERGIA DE BANDA
    // ======================================

    measureBandEnergy(
        spectrum,
        sampleRate,
        fftSize,
        band
    ) {

        const nyquist =
            sampleRate / 2;


        const binWidth =
            sampleRate /
            fftSize;


        const low =
            this.clamp(
                band.lowFrequency,
                0,
                nyquist
            );


        const high =
            this.clamp(
                band.highFrequency,
                0,
                nyquist
            );


        let startBin =
            Math.floor(
                low /
                binWidth
            );


        let endBin =
            Math.ceil(
                high /
                binWidth
            );


        startBin =
            this.clamp(
                startBin,
                0,
                spectrum.length - 1
            );


        endBin =
            this.clamp(
                endBin,
                startBin + 1,
                spectrum.length - 1
            );


        let sum =
            0;


        let count =
            0;


        for (
            let bin = startBin;
            bin <= endBin;
            bin++
        ) {

            const magnitude =
                spectrum[bin];


            sum +=
                magnitude *
                magnitude;


            count++;
        }


        if (
            count <= 0
        ) {

            return 0;
        }


        return Math.sqrt(
            sum /
            count
        );
    }


    // ======================================
    // ANALISAR FRAME
    // ======================================

    analyzeFrame(
        mono,
        start,
        sampleRate,
        fftSize,
        window
    ) {

        const real =
            new Float32Array(
                fftSize
            );


        const imag =
            new Float32Array(
                fftSize
            );


        let frameEnergy =
            0;


        for (
            let i = 0;
            i < fftSize;
            i++
        ) {

            const index =
                start +
                i;


            let sample =
                0;


            if (
                index >= 0 &&
                index < mono.length
            ) {

                sample =
                    mono[index];
            }


            const windowed =
                sample *
                window[i];


            real[i] =
                windowed;


            frameEnergy +=
                windowed *
                windowed;
        }


        const rms =
            Math.sqrt(
                frameEnergy /
                fftSize
            );


        const transformed =
            this.fft(
                real,
                imag
            );


        const spectrum =
            this.calculateSpectrum(
                transformed.real,
                transformed.imag
            );


        const bands =
            new Float32Array(
                this.bandCount
            );


        for (
            let i = 0;
            i < this.bandCount;
            i++
        ) {

            bands[i] =
                this.measureBandEnergy(
                    spectrum,
                    sampleRate,
                    fftSize,
                    this.bands[i]
                );
        }


        return {

            rms,

            bands
        };
    }


    // ======================================
    // ESTATÍSTICAS
    // ======================================

    calculateStatistics(
        values
    ) {

        if (
            !values ||
            values.length === 0
        ) {

            return {

                mean:
                    0,

                peak:
                    0,

                min:
                    0,

                variance:
                    0,

                standardDeviation:
                    0
            };
        }


        let sum =
            0;


        let peak =
            0;


        let min =
            Infinity;


        for (
            let i = 0;
            i < values.length;
            i++
        ) {

            const value =
                values[i];


            sum +=
                value;


            peak =
                Math.max(
                    peak,
                    value
                );


            min =
                Math.min(
                    min,
                    value
                );
        }


        const mean =
            sum /
            values.length;


        let varianceSum =
            0;


        for (
            let i = 0;
            i < values.length;
            i++
        ) {

            const difference =
                values[i] -
                mean;


            varianceSum +=
                difference *
                difference;
        }


        const variance =
            varianceSum /
            values.length;


        return {

            mean,

            peak,

            min,

            variance,

            standardDeviation:
                Math.sqrt(
                    variance
                )
        };
    }


    // ======================================
    // OBTER REFERÊNCIA
    // ======================================

    getReference(
        name
    ) {

        const normalized =
            String(
                name ||
                "neutral"
            )
            .toLowerCase();


        if (
            normalized ===
            "warm"
        ) {

            return this.references.warm;
        }


        if (
            normalized ===
            "bright"
        ) {

            return this.references.bright;
        }


        return this.references.neutral;
    }


    // ======================================
    // COMPARAR COM REFERÊNCIA
    // ======================================
    //
    // Esta função SOMENTE calcula distância.
    //
    // Ela NÃO gera ganho.
    //
    // ======================================

    compareToReference(
        bands,
        referenceName
    ) {

        const reference =
            this.getReference(
                referenceName
            );


        const comparisons =
            [];


        for (
            let i = 0;
            i < bands.length;
            i++
        ) {

            const measured =
                bands[i];


            const target =
                reference[i];


            const distance =
                measured.relativeDb -
                target.valueDb;


            const insideTolerance =
                Math.abs(
                    distance
                ) <=
                this.referenceToleranceDb;


            comparisons.push({

                index:
                    measured.index,

                frequency:
                    measured.centerFrequency,

                measuredRelativeDb:
                    measured.relativeDb,

                referenceRelativeDb:
                    target.valueDb,

                distanceDb:
                    distance,

                toleranceDb:
                    this.referenceToleranceDb,

                insideTolerance:
                    insideTolerance,

                confidence:
                    measured.stability
            });
        }


        return {

            reference:
                referenceName,

            toleranceDb:
                this.referenceToleranceDb,

            comparisons:
                comparisons
        };
    }


    // ======================================
    // ANALISAR AUDIO
    // ======================================

    analyze(
        audioBuffer
    ) {

        if (
            !audioBuffer
        ) {

            throw new Error(
                "AudioBuffer inválido para análise espectral."
            );
        }


        const sampleRate =
            audioBuffer.sampleRate ||
            44100;


        const mono =
            this.createMonoBuffer(
                audioBuffer
            );


        if (
            mono.length === 0
        ) {

            return null;
        }


        const fftSize =
            this.resolveFFTSize();


        const hopSize =
            Math.max(
                1,
                Math.min(
                    this.hopSize,
                    fftSize
                )
            );


        const window =
            this.createHannWindow(
                fftSize
            );


        const possibleFrames =
            Math.max(
                1,
                Math.floor(
                    (
                        mono.length -
                        1
                    ) /
                    hopSize
                )
            );


        let frameStep =
            1;


        if (
            possibleFrames >
            this.maxFrames
        ) {

            frameStep =
                Math.ceil(
                    possibleFrames /
                    this.maxFrames
                );
        }


        const bandValues =
            [];


        const frameLoudness =
            [];


        let analyzedFrames =
            0;


        // ----------------------------------
        // FFT TEMPORAL
        // ----------------------------------

        for (
            let frameIndex = 0;
            frameIndex < possibleFrames;
            frameIndex += frameStep
        ) {

            const start =
                frameIndex *
                hopSize;


            const frame =
                this.analyzeFrame(
                    mono,
                    start,
                    sampleRate,
                    fftSize,
                    window
                );


            bandValues.push(
                frame.bands
            );


            frameLoudness.push(
                frame.rms
            );


            analyzedFrames++;
        }


        // ----------------------------------
        // LOUDNESS GLOBAL
        // ----------------------------------

        let loudnessSum =
            0;


        for (
            let i = 0;
            i < frameLoudness.length;
            i++
        ) {

            loudnessSum +=
                frameLoudness[i];
        }


        const globalLoudness =
            frameLoudness.length > 0
                ? loudnessSum /
                  frameLoudness.length
                : 0;


        // ----------------------------------
        // MÉDIAS POR BANDA
        // ----------------------------------

        const meanBands =
            new Float32Array(
                this.bandCount
            );


        let totalBandEnergy =
            0;


        for (
            let bandIndex = 0;
            bandIndex < this.bandCount;
            bandIndex++
        ) {

            let sum =
                0;


            for (
                let frame = 0;
                frame < bandValues.length;
                frame++
            ) {

                sum +=
                    bandValues[frame][
                        bandIndex
                    ];
            }


            const mean =
                bandValues.length > 0
                    ? sum /
                      bandValues.length
                    : 0;


            meanBands[
                bandIndex
            ] =
                mean;


            totalBandEnergy +=
                mean;
        }


        // ----------------------------------
        // RESULTADO DAS BANDAS
        // ----------------------------------

        const bands =
            [];


        let stabilitySum =
            0;


        for (
            let bandIndex = 0;
            bandIndex < this.bandCount;
            bandIndex++
        ) {

            const values =
                new Float32Array(
                    bandValues.length
                );


            for (
                let frame = 0;
                frame < bandValues.length;
                frame++
            ) {

                values[frame] =
                    bandValues[frame][
                        bandIndex
                    ];
            }


            const statistics =
                this.calculateStatistics(
                    values
                );


            const mean =
                statistics.mean;


            const relative =
                globalLoudness > 0
                    ? mean /
                      globalLoudness
                    : 0;


            const spectrumShare =
                totalBandEnergy > 0
                    ? mean /
                      totalBandEnergy
                    : 0;


            const relativeDb =
                relative > 0
                    ? this.amplitudeToDb(
                        relative
                    )
                    : -120;


            const temporalVariation =
                mean > 0
                    ? this.clamp(
                        statistics.standardDeviation /
                        mean,
                        0,
                        10
                    )
                    : 0;


            const stability =
                this.clamp(
                    1 -
                    (
                        temporalVariation /
                        2
                    ),
                    0,
                    1
                );


            stabilitySum +=
                stability;


            bands.push({

                index:
                    bandIndex,

                lowFrequency:
                    this.bands[
                        bandIndex
                    ].lowFrequency,

                highFrequency:
                    this.bands[
                        bandIndex
                    ].highFrequency,

                centerFrequency:
                    this.bands[
                        bandIndex
                    ].centerFrequency,

                mean:
                    mean,

                peak:
                    statistics.peak,

                minimum:
                    statistics.min,

                standardDeviation:
                    statistics.standardDeviation,

                relativeToBroadband:
                    relative,

                relativeDb:
                    relativeDb,

                spectrumShare:
                    spectrumShare,

                temporalVariation:
                    temporalVariation,

                stability:
                    stability
            });
        }


        const averageStability =
            bands.length > 0
                ? stabilitySum /
                  bands.length
                : 0;


        // ----------------------------------
        // CONFIANÇA
        // ----------------------------------

        const frameConfidence =
            this.clamp(
                analyzedFrames /
                40,
                0,
                1
            );


        const loudnessConfidence =
            globalLoudness >
            0.00001
                ? 1
                : 0;


        const confidence =
            this.clamp(
                (
                    frameConfidence *
                    0.40
                ) +
                (
                    loudnessConfidence *
                    0.20
                ) +
                (
                    averageStability *
                    0.40
                ),
                0,
                1
            );


        // ----------------------------------
        // COMPARAÇÕES
        // ----------------------------------
        //
        // Apenas informativas.
        //
        // Nenhuma correção é calculada.
        //
        // ----------------------------------

        const neutralComparison =
            this.compareToReference(
                bands,
                "neutral"
            );


        const warmComparison =
            this.compareToReference(
                bands,
                "warm"
            );


        const brightComparison =
            this.compareToReference(
                bands,
                "bright"
            );


        // ----------------------------------
        // RESULTADO
        // ----------------------------------

        const result = {

            version:
                "0.2",


            mode:
                "analysis-only",


            sampleRate:
                sampleRate,


            fftSize:
                fftSize,


            hopSize:
                hopSize,


            bandCount:
                this.bandCount,


            minFrequency:
                this.minFrequency,


            maxFrequency:
                this.maxFrequency,


            analyzedFrames:
                analyzedFrames,


            globalLoudness:
                globalLoudness,


            globalLoudnessDb:
                this.amplitudeToDb(
                    globalLoudness
                ),


            averageStability:
                averageStability,


            confidence:
                confidence,


            bands:
                bands,


            references: {

                toleranceDb:
                    this.referenceToleranceDb,

                neutral:
                    this.references.neutral,

                warm:
                    this.references.warm,

                bright:
                    this.references.bright
            },


            comparisons: {

                neutral:
                    neutralComparison,

                warm:
                    warmComparison,

                bright:
                    brightComparison
            },


            processing: {

                applied:
                    false,

                gainApplied:
                    0
            }
        };


        this.lastAnalysis =
            result;


        return result;
    }


    // ======================================
    // ALIAS DE COMPATIBILIDADE
    // ======================================
    //
    // Mantemos analyzeBuffer() para facilitar
    // futuras integrações sem exigir que o
    // módulo consumidor conheça a implementação.
    //
    // ======================================

    analyzeBuffer(
        audioBuffer
    ) {

        return this.analyze(
            audioBuffer
        );
    }


    // ======================================
    // ÚLTIMA ANÁLISE
    // ======================================

    getLastAnalysis() {

        return this.lastAnalysis;
    }


    // ======================================
    // BANDAS
    // ======================================

    getBands() {

        return this.bands.slice();
    }


    // ======================================
    // REFERÊNCIAS
    // ======================================

    getReferences() {

        return {

            neutral:
                this.references.neutral.slice(),

            warm:
                this.references.warm.slice(),

            bright:
                this.references.bright.slice()
        };
    }
}


// ==========================================
// DISPONIBILIZAR GLOBALMENTE
// ==========================================

window.SpectralBalancer =
    SpectralBalancer;