import { Product } from '../../models/Product.js';

export const CatalogMatcher = {
  /**
   * Match extracted product query and variant attributes against real organization catalog
   */
  async matchProduct({ organizationId, productQuery, color = '', size = '', material = '' }) {
    if (!productQuery || !organizationId) {
      return { matchFound: false, candidate: null, variant: null, isAmbiguous: false };
    }

    const tokens = productQuery.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
    const regexQueries = tokens.map((t) => new RegExp(t, 'i'));

    // Find candidate products matching any of the tokens or category
    const candidates = await Product.find({
      organizationId,
      isActive: true,
      $or: [
        { name: { $in: regexQueries } },
        { category: { $in: regexQueries } },
        { sku: new RegExp(productQuery.trim(), 'i') },
      ],
    }).limit(10);

    if (candidates.length === 0) {
      // Fallback: search all active products for keyword match
      const fallback = await Product.find({ organizationId, isActive: true }).limit(20);
      const scored = fallback
        .map((p) => {
          let score = 0;
          const fullName = `${p.name} ${p.category} ${p.sku}`.toLowerCase();
          tokens.forEach((t) => {
            if (fullName.includes(t)) score += 1;
          });
          return { product: p, score };
        })
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score);

      if (scored.length > 0) {
        return this.resolveVariant(scored[0].product, { color, size, material });
      }

      return { matchFound: false, candidate: null, variant: null, isAmbiguous: false, possibleCandidates: [] };
    }

    // Score candidates based on match count
    const scoredCandidates = candidates
      .map((p) => {
        let score = 0;
        const pText = `${p.name} ${p.category} ${p.sku}`.toLowerCase();
        tokens.forEach((t) => {
          if (pText.includes(t)) score += 2;
        });
        return { product: p, score };
      })
      .sort((a, b) => b.score - a.score);

    const topCandidate = scoredCandidates[0].product;
    const isAmbiguous =
      scoredCandidates.length > 1 &&
      scoredCandidates[0].score === scoredCandidates[1].score &&
      scoredCandidates[0].score > 0;

    return {
      ...this.resolveVariant(topCandidate, { color, size, material }),
      isAmbiguous,
      possibleCandidates: scoredCandidates.slice(0, 3).map((s) => ({
        id: s.product._id,
        name: s.product.name,
        sku: s.product.sku,
      })),
    };
  },

  /**
   * Helper to match specific variant on candidate product
   */
  resolveVariant(product, { color, size, material }) {
    if (!product.variants || product.variants.length === 0) {
      return { matchFound: true, candidate: product, variant: null };
    }

    const cLower = (color || '').toLowerCase();
    const sLower = (size || '').toLowerCase();
    const mLower = (material || '').toLowerCase();

    // Check variants for attribute match
    const matchingVariant = product.variants.find((v) => {
      const vText = `${v.sku} ${v.name} ${v.attributes?.color || ''} ${v.attributes?.size || ''}`.toLowerCase();
      const colorMatch = !cLower || vText.includes(cLower);
      const sizeMatch = !sLower || vText.includes(sLower);
      return colorMatch && sizeMatch;
    });

    return {
      matchFound: true,
      candidate: product,
      variant: matchingVariant || product.variants[0],
    };
  },
};
