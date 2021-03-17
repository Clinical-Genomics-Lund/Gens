// Draw variants
VARIANT_TR_TABLE = {del: 'deletion', dup: 'duplication'}

class Variant extends Track {
  constructor (x, width, near, far, hgType, colorSchema, highlightedVariantId) {
    // Dimensions of track canvas
    const visibleHeight = 100; // Visible height for expanded canvas, overflows for scroll
    const minHeight = 35; // Minimized height

    super(width, near, far, visibleHeight, minHeight, colorSchema);

    // Set inherited variables
    this.drawCanvas = document.getElementById('variant-draw');
    this.contentCanvas = document.getElementById('variant-content');
    this.trackTitle = document.getElementById('variant-titles');
    this.trackContainer = document.getElementById('variant-track-container');
    this.featureHeight = 18;
    this.arrowThickness = 2;

    // Setup html objects now that we have gotten the canvas and div elements
    this.setupHTML(x + 1);

    this.trackContainer.style.marginTop = '-1px';
    this.hgType = hgType;

    // GENS api parameters
    this.apiEntrypoint = 'get-variant-data';
    this.additionalQueryParams = {variant_category: 'sv'}

    // Initialize highlighted variant
    this.highlightedVariantId = highlightedVariantId;
  }

  // Draw highlight for a given region
  drawHighlight (startPos, endPos, color='rgb(255, 200, 87, 0.5)') {
    this.drawBox(startPos, 0,
      endPos - startPos + 1,
      this.visibleHeight,
      color
      )
  }

  async drawOffScreenTrack(queryResult) {
    //  Draws variants in given range
    const titleMargin = 2;
    const textSize = 10;
    // store positions used when rendering the canvas
    this.offscreenPosition = {
      start: queryResult.start_pos,
      end: queryResult.end_pos,
      scale: this.drawCanvas.width /
        (queryResult.end_pos - queryResult.start_pos),
    };
    const scale = this.offscreenPosition.scale;

    // Set needed height of visible canvas and transcript tooltips
    this.setContainerHeight(queryResult.max_height_order);

    // Keeps track of previous values
    this.heightOrderRecord = {
      latestHeight: 0,    // Latest height order for annotation
      latestNameEnd: 0,  // Latest annotations end position
      latestTrackEnd: 0, // Latest annotations title's end position
    };


    // limit drawing of annotations to pre-defined resolutions
    let filteredVariants = [];
    if (this.getResolution < this.maxResolution + 1) {
      filteredVariants = queryResult
        .data
        .variants
        .filter(variant => isElementOverlapping(
          {start: variant.position, end: variant.end},
          {start: queryResult.start_pos, end: queryResult.end_pos}));
    }
    // dont show tracks with no data in them
    if ( filteredVariants.length > 0 &&
         this.getResolution < this.maxResolution + 1
       ) {
      this.setContainerHeight(this.trackData.max_height_order);
    } else {
      this.setContainerHeight(0);
    }
    this.clearTracks();

    // Draw track
    for ( const variant of filteredVariants ) {
      const variantName = variant.display_name; // varaint name
      const chrom = variant.chromosome;
      const variantCategory = variant.sub_category;  // del, dup, sv, str
      const variantType = variant.variant_type;
      const variantLength = variant.length;
      const quality = variant.quality;
      const rankScore = variant.rank_score;
      const variantStart = variant.position;
      const variantEnd = variant.end;
      const color = this.colorSchema[variantCategory] || this.colorSchema.default || 'black';
      const heightOrder = 1;
      const canvasYPos = this.tracksYPos(heightOrder);

      // Only draw visible tracks
      if (!this.expanded && heightOrder != 1)
        continue

      // Keep track of latest track
      if ( this.heightOrderRecord.latestHeight != heightOrder ) {
        this.heightOrderRecord = {
          latestHeight: heightOrder,
          latestNameEnd: 0,
          latestTrackEnd: 0,
        }
      }
      // if set begining draw
      const drawStartCoord = scale * (variantStart - this.offscreenPosition.start);
      const drawEndCoord = scale * (variantEnd - this.offscreenPosition.start);
      // Draw motif line
      switch (variantCategory) {
        case 'del':
          const waveHeight = 7;
          this.drawWaveLine(drawStartCoord,
                            drawEndCoord,
                            canvasYPos + waveHeight / 2,
                            waveHeight,
                            color);
          break;
        case 'dup':
          this.drawLine(drawStartCoord, drawEndCoord, canvasYPos + 4, color);
          this.drawLine(drawStartCoord, drawEndCoord, canvasYPos, color);
          break;
        default:  // other types of elements
          this.drawLine(drawStartCoord, drawEndCoord, canvasYPos, color);
          console.log(`Unhandled variant type ${variantCategory}; drawing default shape`)
      }
      // Move and display highlighted region
      if (variant._id == this.highlightedVariantId) {
        this.drawHighlight(drawStartCoord, drawEndCoord);
      }

      const textYPos = this.tracksYPos(heightOrder);
      // Draw variant type
      this.heightOrderRecord.latestNameEnd = this.drawText(
        `${variant["category"]} - ${variantType} ${VARIANT_TR_TABLE[variantCategory]}; length: ${variantLength}`,
        scale * ((variantStart + variantEnd) / 2 - this.offscreenPosition.start),
        textYPos + this.featureHeight,
        textSize,
        this.heightOrderRecord.latestNameEnd
      );

      // Set tooltip text
      let variantText = `Id: ${variantName}\n` +
                        `Position: ${chrom}:${variantStart}-${variantEnd}\n` +
                        `Type: ${variantType} ${variantCategory}\n` +
                        `Quality: ${quality}\n` +
                        `Rank score: ${rankScore}\n`;

      // Add tooltip title for whole gene
      // this.heightOrderRecord.latestTrackEnd = this.hoverText(
      //   variantText,
      //   `${titleMargin + scale * (variantStart - this.offscreenPosition.start)}px`,
      //   `${titleMargin + textYPos - this.featureHeight / 2}px`,
      //   `${scale * (variantEnd - variantStart)}px`,
      //   `${this.featureHeight + textSize}px`,
      //   0,
      //   this.heightOrderRecord.latestTrackEnd
      // );
    }
  }
}
