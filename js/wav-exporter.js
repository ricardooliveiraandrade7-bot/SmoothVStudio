"use strict";


class WavExporter {
    
    static validateAudioBuffer(
        audioBuffer
    ) {
        
        if (
            !audioBuffer
        ) {
            
            throw new Error(
                "AudioBuffer inválido."
            );
        }
        
        
        if (
            typeof audioBuffer.numberOfChannels !==
            "number" ||
            audioBuffer.numberOfChannels <= 0
        ) {
            
            throw new Error(
                "Número de canais inválido."
            );
        }
        
        
        if (
            typeof audioBuffer.length !==
            "number" ||
            audioBuffer.length <= 0
        ) {
            
            throw new Error(
                "Comprimento do áudio inválido."
            );
        }
        
        
        if (
            typeof audioBuffer.sampleRate !==
            "number" ||
            audioBuffer.sampleRate <= 0
        ) {
            
            throw new Error(
                "Sample rate inválido."
            );
        }
        
        
        if (
            typeof audioBuffer.getChannelData !==
            "function"
        ) {
            
            throw new Error(
                "AudioBuffer sem dados de canal."
            );
        }
        
        
        return true;
    }
    
    
    static clampSample(
        sample
    ) {
        
        if (
            !Number.isFinite(
                sample
            )
        ) {
            
            return 0;
        }
        
        
        return Math.max(
            -1,
            Math.min(
                1,
                sample
            )
        );
    }
    
    
    static floatTo24Bit(
        sample
    ) {
        
        const value =
            WavExporter.clampSample(
                sample
            );
        
        
        if (
            value < 0
        ) {
            
            return Math.round(
                value * 8388608
            );
        }
        
        
        return Math.round(
            value * 8388607
        );
    }
    
    
    static writeUint16(
        view,
        offset,
        value
    ) {
        
        view.setUint16(
            offset,
            value,
            true
        );
    }
    
    
    static writeUint32(
        view,
        offset,
        value
    ) {
        
        view.setUint32(
            offset,
            value,
            true
        );
    }
        static writeString(
        view,
        offset,
        value
    ) {

        for (
            let index = 0;
            index < value.length;
            index++
        ) {

            view.setUint8(
                offset + index,
                value.charCodeAt(
                    index
                )
            );
        }
    }


    static writeInt24(
        view,
        offset,
        value
    ) {

        let unsignedValue;


        if (
            value < 0
        ) {

            unsignedValue =
                value + 16777216;

        } else {

            unsignedValue =
                value;
        }


        view.setUint8(
            offset,
            unsignedValue & 0xff
        );


        view.setUint8(
            offset + 1,
            (
                unsignedValue >>
                8
            ) & 0xff
        );


        view.setUint8(
            offset + 2,
            (
                unsignedValue >>
                16
            ) & 0xff
        );
    }


    static calculateWavSize(
        audioBuffer
    ) {

        const bytesPerSample =
            3;


        const blockAlign =
            audioBuffer.numberOfChannels *
            bytesPerSample;


        const dataSize =
            audioBuffer.length *
            blockAlign;


        const headerSize =
            44;


        return {

            bytesPerSample,

            blockAlign,

            dataSize,

            totalSize:
                headerSize +
                dataSize
        };
    }


    static createBlob(
        audioBuffer
    ) {

        WavExporter.validateAudioBuffer(
            audioBuffer
        );


        const sizes =
            WavExporter.calculateWavSize(
                audioBuffer
            );


        const arrayBuffer =
            new ArrayBuffer(
                sizes.totalSize
            );


        const view =
            new DataView(
                arrayBuffer
            );


        WavExporter.writeString(
            view,
            0,
            "RIFF"
        );


        WavExporter.writeUint32(
            view,
            4,
            sizes.totalSize - 8
        );


        WavExporter.writeString(
            view,
            8,
            "WAVE"
        );
                WavExporter.writeString(
            view,
            12,
            "fmt "
        );


        WavExporter.writeUint32(
            view,
            16,
            16
        );


        WavExporter.writeUint16(
            view,
            20,
            1
        );


        WavExporter.writeUint16(
            view,
            22,
            audioBuffer.numberOfChannels
        );


        WavExporter.writeUint32(
            view,
            24,
            audioBuffer.sampleRate
        );


        const byteRate =
            audioBuffer.sampleRate *
            sizes.blockAlign;


        WavExporter.writeUint32(
            view,
            28,
            byteRate
        );


        WavExporter.writeUint16(
            view,
            32,
            sizes.blockAlign
        );


        WavExporter.writeUint16(
            view,
            34,
            24
        );


        WavExporter.writeString(
            view,
            36,
            "data"
        );


        WavExporter.writeUint32(
            view,
            40,
            sizes.dataSize
        );


        let offset =
            44;


        const channelData =
            [];


        for (
            let channel = 0;
            channel <
            audioBuffer.numberOfChannels;
            channel++
        ) {

            channelData[channel] =
                audioBuffer.getChannelData(
                    channel
                );
        }


        for (
            let sampleIndex = 0;
            sampleIndex <
            audioBuffer.length;
            sampleIndex++
        ) {

            for (
                let channel = 0;
                channel <
                audioBuffer.numberOfChannels;
                channel++
            ) {

                const sample =
                    channelData[channel][
                        sampleIndex
                    ];


                const pcmValue =
                    WavExporter.floatTo24Bit(
                        sample
                    );


                WavExporter.writeInt24(
                    view,
                    offset,
                    pcmValue
                );


                offset +=
                    3;
            }
        }


        const blob =
            new Blob(
                [
                    arrayBuffer
                ],
                {
                    type:
                        "audio/wav"
                }
            );


        WavExporter.validateBlob(
            blob
        );


        return blob;
    }
        static createFile(
        audioBuffer,
        fileName =
            "smoothvstudio-vocal.wav"
    ) {

        const blob =
            WavExporter.createBlob(
                audioBuffer
            );


        return new File(
            [
                blob
            ],
            fileName,
            {
                type:
                    "audio/wav"
            }
        );
    }


    static validateBlob(
        blob
    ) {

        if (
            !blob
        ) {

            throw new Error(
                "O WAV não foi gerado."
            );
        }


        if (
            !(blob instanceof Blob)
        ) {

            throw new Error(
                "Resultado WAV inválido."
            );
        }


        if (
            blob.size < 44
        ) {

            throw new Error(
                "Tamanho WAV inválido."
            );
        }


        return true;
    }


    static async validateWavBlob(
        blob
    ) {

        WavExporter.validateBlob(
            blob
        );


        const header =
            await blob
                .slice(
                    0,
                    44
                )
                .arrayBuffer();


        const view =
            new DataView(
                header
            );


        const riff =
            String.fromCharCode(
                view.getUint8(0),
                view.getUint8(1),
                view.getUint8(2),
                view.getUint8(3)
            );


        const wave =
            String.fromCharCode(
                view.getUint8(8),
                view.getUint8(9),
                view.getUint8(10),
                view.getUint8(11)
            );


        const audioFormat =
            view.getUint16(
                20,
                true
            );


        const bitsPerSample =
            view.getUint16(
                34,
                true
            );


        const dataTag =
            String.fromCharCode(
                view.getUint8(36),
                view.getUint8(37),
                view.getUint8(38),
                view.getUint8(39)
            );
                    if (
            riff !==
            "RIFF"
        ) {

            throw new Error(
                "Cabeçalho RIFF inválido."
            );
        }


        if (
            wave !==
            "WAVE"
        ) {

            throw new Error(
                "Cabeçalho WAVE inválido."
            );
        }


        if (
            audioFormat !==
            1
        ) {

            throw new Error(
                "O WAV não está em PCM."
            );
        }


        if (
            bitsPerSample !==
            24
        ) {

            throw new Error(
                "O WAV não está em 24-bit."
            );
        }


        if (
            dataTag !==
            "data"
        ) {

            throw new Error(
                "Chunk data inválido."
            );
        }


        return true;
    }


    static getWavInfo(
        audioBuffer
    ) {

        WavExporter.validateAudioBuffer(
            audioBuffer
        );


        const sizes =
            WavExporter.calculateWavSize(
                audioBuffer
            );


        return {

            format:
                "PCM",

            bitDepth:
                24,

            sampleRate:
                audioBuffer.sampleRate,

            numberOfChannels:
                audioBuffer.numberOfChannels,

            numberOfSamples:
                audioBuffer.length,

            duration:
                audioBuffer.duration,

            bytesPerSample:
                sizes.bytesPerSample,

            blockAlign:
                sizes.blockAlign,

            byteRate:
                audioBuffer.sampleRate *
                sizes.blockAlign,

            dataSize:
                sizes.dataSize,

            totalSize:
                sizes.totalSize
        };
    }


    static validateStructure(
        audioBuffer
    ) {

        WavExporter.validateAudioBuffer(
            audioBuffer
        );


        const sizes =
            WavExporter.calculateWavSize(
                audioBuffer
            );


        if (
            sizes.bytesPerSample !==
            3
        ) {

            throw new Error(
                "Profundidade PCM inválida."
            );
        }


        if (
            sizes.blockAlign !==
            audioBuffer.numberOfChannels *
            3
        ) {

            throw new Error(
                "Block align inválido."
            );
        }
                if (
            sizes.dataSize !==
            audioBuffer.length *
            audioBuffer.numberOfChannels *
            3
        ) {
            
            throw new Error(
                "Tamanho dos dados inválido."
            );
        }
        
        
        return true;
        }
        }
        
        
        window.WavExporter =
            WavExporter;
            