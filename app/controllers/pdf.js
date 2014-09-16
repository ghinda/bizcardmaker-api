/* PDF generation for final printing.
 *
 * Uses imagemagick to convert the image to cmyk.
 * Uses ghostscript to convert the pdf to cmyk,
 * as ghostscript has better results on openshift.
 */

module.exports = (function(config) {
  'use strict';

  var fs = require('fs');
  var spawn = require('child_process').spawn;
  var Stream = require('stream');
  var PDFDocument = require('pdfkit');
  var base64 = require('base64-stream');

  var repoDir = process.cwd();

  // PDF sizes
  var margin = config.margin * 72;
  var trim = config.trim * 72;
  var trimWithMargin = trim + margin;
  var trimSubstract = 0.06 * 72;

  var cardWidth = config.card[0] * 72;
  var cardHeight = config.card[1] * 72;

  var trimLines = [
    // top left
    {
      x: trimWithMargin,
      y: trimSubstract,
      x1: trimWithMargin,
      y1: trimWithMargin - trimSubstract
    },
    {
      x: trimSubstract,
      y: trimWithMargin,
      x1: trimWithMargin - trimSubstract,
      y1: trimWithMargin
    },

    // top right
    {
      x: cardWidth + margin - trim,
      y: trimSubstract,
      x1: cardWidth + margin - trim,
      y1: trimWithMargin - trimSubstract
    },
    {
      x: cardWidth + margin - trim + trimSubstract,
      y: trimWithMargin,
      x1: cardWidth + (margin * 2) - trimSubstract,
      y1: trimWithMargin
    },

    // bottom left
    {
      x: trimWithMargin,
      y: cardHeight + margin - trim + trimSubstract,
      x1: trimWithMargin,
      y1: cardHeight + (margin * 2) - trimSubstract
    },
    {
      x: trimSubstract,
      y: cardHeight + margin - trim,
      x1: trimWithMargin - trimSubstract,
      y1: cardHeight + margin - trim
    },

    // bottom right
    {
      x: cardWidth + margin - trim,
      y: cardHeight + margin - trim + trimSubstract,
      x1: cardWidth + margin - trim,
      y1: cardHeight + (margin * 2) - trimSubstract
    },
    {
      x: cardWidth + margin - trim + trimSubstract,
      y: cardHeight + margin - trim,
      x1: cardWidth + (margin * 2) - trimSubstract,
      y1: cardHeight + margin - trim
    }
  ];

  // convert stream to CMYK
  var convertCmyk = function(streamIn) {

    var initialProfile = repoDir + 'profiles/sRGB.icc';
    var cmykProfile = repoDir + 'profiles/USWebCoatedSWOP.icc';

    var command = 'convert';

    var args = [];

    // jpg args
    args = [
      '-density', config.density,
      '-',
      '+strip',
      '-profile', initialProfile,
      '-profile', cmykProfile,
      '-units', 'PixelsPerInch',
      '-density', config.density,
      '-quality', '100',
      '-sampling-factor', '1x1',
      '-compress', 'lzw',
      '-'
    ];

    var proc = spawn(command, args);

    var stream = new Stream();

// 		proc.stderr.on('data', stream.emit.bind(stream, 'error'));
    proc.stdout.on('data', stream.emit.bind(stream, 'data'));
    proc.stdout.on('end', stream.emit.bind(stream, 'end'));

    proc.on('error', stream.emit.bind(stream, 'error'));

    streamIn.pipe(proc.stdin);

    // it seems that openshift imagemagick gets stuck on errors
    // that's why I commented it out

    // prevent the app from crashing on `convert` errors
    // and log imagemagick errors
// 		stream.on('error', function(err) {
// 			console.warn('ImageMagick error on CMYK converstion: ');
// 			console.warn(err.toString());
// 		});

    return stream;

  };

  var convertPdfCmyk = function(streamIn, file) {

    var command = config.ghostscript;

    var args = [];

    // ghostscript args
    args = [
      // cmyk conversion
      '-sDEVICE=pdfwrite',
      '-dPDFX',
      '-dColorConversionStrategy=/CMYK',
      '-dProcessColorModel=/DeviceCMYK',
      '-sColorConversionStrategyForImages=/CMYK',
      '-sOutputICCProfile=' + repoDir + '/profiles/USWebCoatedSWOP.icc',

      // high quality images
      '-dDownsampleMonoImages=false',
      '-dDownsampleGrayImages=false',
      '-dDownsampleColorImages=false',
      '-dAutoFilterColorImages=false',
      '-dAutoFilterGrayImages=false',
      '-dColorImageFilter=/FlateEncode',
      '-dGrayImageFilter=/FlateEncode',
      '-dEncodeColorImages=false',
      '-dEncodeGrayImages=false',
      '-dEncodeMonoImages=false',

      //'<(pdftops -level3sep ', '-', '-)',
      '-sOutputFile=-',
      '-f', '-'
    ];

    var proc = spawn(command, args);

    var stream = new Stream();

    proc.stderr.on('data', stream.emit.bind(stream, 'error'));
    proc.stdout.on('data', stream.emit.bind(stream, 'data'));
    proc.stdout.on('end', stream.emit.bind(stream, 'end'));

    proc.on('error', stream.emit.bind(stream, 'error'));

    stream.on('error', function(err) {
      console.warn('Ghostscript error on CMYK converstion: ');
      console.warn(err.toString());
    });

    streamIn.pipe(proc.stdin);

    return stream;

  };

  var pdf = function() {

    var imgData = new Buffer('');
    var pdfStream = new Stream.Transform();
    pdfStream._transform = function (chunk, encoding, done) {

      // TODO somehow get the final buffer in _flash
      // without having to manually concat

      // manually concat the final image buffer
      imgData = Buffer.concat([imgData, chunk]);

      done();
    };

    // final call
    pdfStream._flush = function() {

      // create pdf doc
      var doc = new PDFDocument({
        size: [
          cardWidth + margin * 2,
          cardHeight + margin * 2
        ]
      });

      // write image buffer to pdf
      doc.image(imgData, margin, margin, {
        width: cardWidth,
        height: cardHeight
      });

      // write the trim lines
      trimLines.forEach(function(line) {

        doc.moveTo(line.x, line.y)
          .lineTo(line.x1, line.y1)
          .stroke();

      });

      // done editing pdf
      doc.end();

      // apply the cmyk colorspace to the pdf
// 			var convertPdf = convertCmyk(doc);
      var convertPdf = convertPdfCmyk(doc);

      // convert converted PDF to buffer
      var bufs = [];
      convertPdf.on('data', function(d){ bufs.push(d); });

      convertPdf.on('end', function(){
        var pdfBuf = Buffer.concat(bufs);

        // callback with pdf buffer
        generateCallback(pdfBuf);
      });

    };

    pdfStream.on('error', function(err){
      console.log('PDF generator stream error: ', err);
    });

    return pdfStream;

  };

  var generateCallback = function(){};

  var generate = function(image, callback) {

    // cleanup data-uri
    image = image.replace(/^data:image\/(jpg|jpeg|png);base64,/,'');

    // convert string to stream
    var streamIn = new Stream.Readable();
    streamIn._read = function noop() {};
    streamIn.push(image);
    streamIn.push(null);

    // get the real callback
    generateCallback = callback;

    //convertCmyk(
      streamIn.pipe(base64.decode())
    //).pipe(
    .pipe(
      pdf()
    );

  };

  return {
    generate: generate
  };

});
