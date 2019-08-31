/**
 * @license
 * Visual Blocks Editor
 *
 * Copyright 2016 Google Inc.
 * https://developers.google.com/blockly/
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Methods for graphically rendering a block as SVG.
 * @author fenichel@google.com (Rachel Fenichel)
 */

'use strict';

goog.provide('Blockly.BlockSvg.render');

goog.require('Blockly.blockRendering');
goog.require('Blockly.BlockSvg');
goog.require('Blockly.utils.dom');


/**
 * An object that holds information about the paths that are used to render the
 * block.  Each path is built up as an array of steps during the render process.
 * The arrays are then turned into strings, which are set in the block's SVG.
 * @constructor
 * @struct
 * @private
 */
Blockly.BlockSvg.PathObject = function() {
  /**
   * The primary outline of the block.
   * @type {!Array.<string|number>}
   */
  this.steps = [];

  /**
   * The highlight on the primary outline of the block.
   * @type {!Array.<string|number>}
   */
  this.highlightSteps = [];

  /**
   * The holes in the block for inline inputs.
   * @type {!Array.<string|number>}
   */
  this.inlineSteps = [];

  /**
   * The highlights on holes in the block for inline inputs.
   * @type {!Array.<string|number>}
   */
  this.highlightInlineSteps = [];
};

// UI constants for rendering blocks.
/**
 * Vertical space between elements.
 * @const
 */
Blockly.BlockSvg.SEP_SPACE_Y = 10;
/**
 * Minimum height of a block.
 * @const
 */
Blockly.BlockSvg.MIN_BLOCK_Y = 25;
/**
 * Width of horizontal puzzle tab.
 * @const
 */
Blockly.BlockSvg.TAB_WIDTH = 8;

/**
 * Do blocks with no previous or output connections have a 'hat' on top?
 * @const
 */
Blockly.BlockSvg.START_HAT = false;

/**
 * Returns a bounding box describing the dimensions of this block
 * and any blocks stacked below it.
 * @return {!{height: number, width: number}} Object with height and width
 *    properties in workspace units.
 */
Blockly.BlockSvg.prototype.getHeightWidth = function() {
  var height = this.height;
  var width = this.width;
  // Recursively add size of subsequent blocks.
  var nextBlock = this.getNextBlock();
  if (nextBlock) {
    var nextHeightWidth = nextBlock.getHeightWidth();
    height += nextHeightWidth.height - 4;  // Height of tab.
    width = Math.max(width, nextHeightWidth.width);
  }
  return {height: height, width: width};
};

/**
 * Update the block's SVG paths based on the paths that were computed during
 * this render pass.
 * @param {!Blockly.BlockSvg.PathObject} pathObject The object containing
 *     partially constructed SVG paths, which will be modified by this function.
 * @private
 */
Blockly.BlockSvg.prototype.setPaths_ = function(pathObject) {
  var pathString = pathObject.steps.join(' ') + '\n' +
      pathObject.inlineSteps.join(' ');
  this.svgPath_.setAttribute('d', pathString);
  this.svgPathDark_.setAttribute('d', pathString);

  pathString = pathObject.highlightSteps.join(' ') + '\n' +
      pathObject.highlightInlineSteps.join(' ');
  this.svgPathLight_.setAttribute('d', pathString);
  if (this.RTL) {
    // Mirror the block's path.
    this.svgPath_.setAttribute('transform', 'scale(-1 1)');
    this.svgPathLight_.setAttribute('transform', 'scale(-1 1)');
    this.svgPathDark_.setAttribute('transform', 'translate(1,1) scale(-1 1)');
  }
};

/**
 * Position an new block correctly, so that it doesn't move the existing block
 * when connected to it.
 * @param {!Blockly.Block} newBlock The block to position - either the first
 *     block in a dragged stack or an insertion marker.
 * @param {!Blockly.Connection} newConnection The connection on the new block's
 *     stack - either a connection on newBlock, or the last NEXT_STATEMENT
 *     connection on the stack if the stack's being dropped before another
 *     block.
 * @param {!Blockly.Connection} existingConnection The connection on the
 *     existing block, which newBlock should line up with.
 */
Blockly.BlockSvg.prototype.positionNewBlock = function(newBlock, newConnection,
    existingConnection) {
  // We only need to position the new block if it's before the existing one,
  // otherwise its position is set by the previous block.
  if (newConnection.type == Blockly.NEXT_STATEMENT ||
      newConnection.type == Blockly.INPUT_VALUE) {
    var dx = existingConnection.x_ - newConnection.x_;
    var dy = existingConnection.y_ - newConnection.y_;

    newBlock.moveBy(dx, dy);
  }
};

/**
 * Visual effect to show that if the dragging block is dropped, this block will
 * be replaced.  If a shadow block, it will disappear.  Otherwise it will bump.
 * @param {boolean} add True if highlighting should be added.
 */
Blockly.BlockSvg.prototype.highlightForReplacement = function(add) {
  if (add) {
    Blockly.utils.dom.addClass(/** @type {!Element} */ (this.svgGroup_),
        'blocklyReplaceable');
  } else {
    Blockly.utils.dom.removeClass(/** @type {!Element} */ (this.svgGroup_),
        'blocklyReplaceable');
  }
};