import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import sharp from 'sharp';

import { Product } from './product.entity';

type ImageFeatures = {
  gray: number[];
  dHash: number[];
  histogram: number[];
};

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository:
      Repository<Product>,
  ) {}

  async getAllProducts() {
    return this.productRepository.find({
      order: {
        id: 'DESC',
      },
    });
  }

  async getProductById(
    id: number,
  ) {
    const product =
      await this.productRepository
        .createQueryBuilder('product')
        .addSelect('product.imageData')
        .where(
          'product.id = :id',
          { id },
        )
        .getOne();

    if (!product) {
      throw new NotFoundException(
        'Product not found',
      );
    }

    return product;
  }

  async createProduct(
    productData: {
      name: string;
      productCode: string;
      sellingPrice: number;
      purchasePrice: number;
      size?: string;
      stock?: number;
      imageData?: string | null;
    },
  ) {
    const product =
      this.productRepository.create(
        productData,
      );

    return this.productRepository.save(
      product,
    );
  }

  async updateProduct(
    id: number,

    productData: {
      name?: string;
      productCode?: string;
      sellingPrice?: number;
      purchasePrice?: number;
      size?: string;
      stock?: number;
      imageData?: string | null;
    },
  ) {
    const product =
      await this.getProductById(id);

    Object.assign(
      product,
      productData,
    );

    return this.productRepository.save(
      product,
    );
  }

  async identifyProduct(
    imageData: string,
  ) {
    if (
      !imageData ||
      typeof imageData !== 'string'
    ) {
      throw new BadRequestException(
        'A captured product image is required.',
      );
    }

    const products =
      await this.productRepository
        .createQueryBuilder('product')
        .addSelect('product.imageData')
        .where(
          'product.imageData IS NOT NULL',
        )
        .andWhere(
          "product.imageData <> ''",
        )
        .getMany();

    if (products.length === 0) {
      return {
        matched: false,
        confidence: 0,

        message:
          'No product reference photo has been saved in the database yet.',
      };
    }

    let queryFeatures:
      ImageFeatures;

    try {
      queryFeatures =
        await this.extractImageFeatures(
          imageData,
        );
    } catch {
      throw new BadRequestException(
        'The captured image could not be processed.',
      );
    }

    let bestProduct:
      Product | null = null;

    let bestScore = 0;

    for (
      const product of products
    ) {
      if (!product.imageData) {
        continue;
      }

      try {
        const referenceFeatures =
          await this.extractImageFeatures(
            product.imageData,
          );

        const score =
          this.compareFeatures(
            queryFeatures,
            referenceFeatures,
          );

        if (
          score > bestScore
        ) {
          bestScore = score;

          bestProduct =
            product;
        }
      } catch {
        // Skip one bad reference image
        // instead of failing the
        // complete identification request.
      }
    }

    const confidence =
      Math.round(
        bestScore * 100,
      );

    // Conservative threshold to reduce
    // accidental matches between
    // visually different products.
    const MATCH_THRESHOLD =
      0.65;

    if (
      !bestProduct ||
      bestScore <
        MATCH_THRESHOLD
    ) {
      return {
        matched: false,
        confidence,

        message:
          'No sufficiently similar product was found. Retake a clear photo with the product centered and a similar viewing angle.',
      };
    }

    return {
      matched: true,
      confidence,
      product: bestProduct,
    };
  }

  async deleteProduct(
    id: number,
  ) {
    const product =
      await this.getProductById(
        id,
      );

    await this.productRepository.remove(
      product,
    );

    return {
      message:
        'Product deleted successfully',

      id,
    };
  }

  private imageDataToBuffer(
    imageData: string,
  ) {
    const commaIndex =
      imageData.indexOf(',');

    const base64 =
      commaIndex >= 0
        ? imageData.slice(
            commaIndex + 1,
          )
        : imageData;

    const buffer =
      Buffer.from(
        base64,
        'base64',
      );

    if (
      buffer.length === 0
    ) {
      throw new Error(
        'Empty image',
      );
    }

    return buffer;
  }

  private async extractImageFeatures(
    imageData: string,
  ): Promise<ImageFeatures> {
    const buffer =
      this.imageDataToBuffer(
        imageData,
      );

    const [
      grayBuffer,
      hashBuffer,
      rgbResult,
    ] =
      await Promise.all([
        sharp(buffer)
          .rotate()
          .resize(
            16,
            16,
            {
              fit: 'fill',
            },
          )
          .grayscale()
          .normalise()
          .raw()
          .toBuffer(),

        sharp(buffer)
          .rotate()
          .resize(
            9,
            8,
            {
              fit: 'fill',
            },
          )
          .grayscale()
          .raw()
          .toBuffer(),

        sharp(buffer)
          .rotate()
          .resize(
            24,
            24,
            {
              fit: 'fill',
            },
          )
          .removeAlpha()
          .toColourspace(
            'srgb',
          )
          .raw()
          .toBuffer({
            resolveWithObject:
              true,
          }),
      ]);

    const gray =
      Array.from(
        grayBuffer as Uint8Array,
      );

    const dHash:
      number[] = [];

    for (
      let y = 0;
      y < 8;
      y += 1
    ) {
      for (
        let x = 0;
        x < 8;
        x += 1
      ) {
        const rowStart =
          y * 9;

        dHash.push(
          hashBuffer[
            rowStart + x
          ] >
            hashBuffer[
              rowStart +
                x +
                1
            ]
            ? 1
            : 0,
        );
      }
    }

    const binsPerChannel =
      16;

    const histogram =
      new Array(
        binsPerChannel *
          3,
      ).fill(0);

    const channels =
      rgbResult.info.channels;

    const rgb =
      rgbResult.data;

    let pixelCount = 0;

    for (
      let i = 0;
      i + 2 < rgb.length;
      i += channels
    ) {
      for (
        let channel = 0;
        channel < 3;
        channel += 1
      ) {
        const value =
          rgb[
            i +
              channel
          ];

        const bin =
          Math.min(
            binsPerChannel -
              1,

            Math.floor(
              value / 16,
            ),
          );

        histogram[
          channel *
            binsPerChannel +
            bin
        ] += 1;
      }

      pixelCount += 1;
    }

    if (
      pixelCount > 0
    ) {
      for (
        let i = 0;
        i <
        histogram.length;
        i += 1
      ) {
        histogram[i] /=
          pixelCount;
      }
    }

    return {
      gray,
      dHash,
      histogram,
    };
  }

  private compareFeatures(
    first: ImageFeatures,
    second: ImageFeatures,
  ) {
    const grayLength =
      Math.min(
        first.gray.length,
        second.gray.length,
      );

    let grayDifference =
      0;

    for (
      let i = 0;
      i < grayLength;
      i += 1
    ) {
      grayDifference +=
        Math.abs(
          first.gray[i] -
            second.gray[i],
        );
    }

    const graySimilarity =
      grayLength > 0
        ? 1 -
          grayDifference /
            (
              grayLength *
              255
            )
        : 0;

    const hashLength =
      Math.min(
        first.dHash.length,
        second.dHash.length,
      );

    let hashMatches = 0;

    for (
      let i = 0;
      i < hashLength;
      i += 1
    ) {
      if (
        first.dHash[i] ===
        second.dHash[i]
      ) {
        hashMatches += 1;
      }
    }

    const hashSimilarity =
      hashLength > 0
        ? hashMatches /
          hashLength
        : 0;

    const histogramSimilarity =
      this.cosineSimilarity(
        first.histogram,
        second.histogram,
      );

    return (
      hashSimilarity *
        0.35 +
      graySimilarity *
        0.35 +
      histogramSimilarity *
        0.3
    );
  }

  private cosineSimilarity(
    first: number[],
    second: number[],
  ) {
    const length =
      Math.min(
        first.length,
        second.length,
      );

    let dot = 0;
    let firstNorm = 0;
    let secondNorm = 0;

    for (
      let i = 0;
      i < length;
      i += 1
    ) {
      dot +=
        first[i] *
        second[i];

      firstNorm +=
        first[i] *
        first[i];

      secondNorm +=
        second[i] *
        second[i];
    }

    if (
      firstNorm === 0 ||
      secondNorm === 0
    ) {
      return 0;
    }

    return (
      dot /
      (
        Math.sqrt(
          firstNorm,
        ) *
        Math.sqrt(
          secondNorm,
        )
      )
    );
  }
}