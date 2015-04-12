/* ZURB responsive tables, patched for performance.
 * http://zurb.com/playground/responsive-tables
 * 
 * patched for better performance when reading the TR>TD height,
 * by getting the height directly from the TR, instead of TR>TD.
 * 
 * USE:
 * - include the responsive-tables.css file from
 * https://github.com/zurb/responsive-tables/
 * - include this js file, instead of responsive-tables.js 
 * from the repo.
 * - add a `responsive` class to the table
 */

$(document).ready(function() {
  var switched = false;
  var updateTables = function() {
    if (($(window).width() < 767) && !switched ){
      switched = true;
      $("table.responsive").each(function(i, element) {
        splitTable($(element));
      });
      return true;
    }
    else if (switched && ($(window).width() > 767)) {
      switched = false;
      $("table.responsive").each(function(i, element) {
        unsplitTable($(element));
      });
    }
  };
  
  $(window).load(updateTables);
  $(window).on("redraw",function(){switched=false;updateTables();}); // An event to listen for
  $(window).on("resize", updateTables);
  
  
  function splitTable(original)
  {
    original.wrap("<div class='table-wrapper' />");
    
    var copy = original.clone();
    copy.find("td:not(:first-child), th:not(:first-child)").css("display", "none");
    copy.removeClass("responsive");
    
    original.closest(".table-wrapper").append(copy);
    copy.wrap("<div class='pinned' />");
    original.wrap("<div class='scrollable' />");

    setCellHeights(original, copy);
  }
  
  function unsplitTable(original) {
    original.closest(".table-wrapper").find(".pinned").remove();
    original.unwrap();
    original.unwrap();
  }

  /* patched setCellHeights to use vanilla js for 
   * getting and setting the height,
   * directly from the tr elements,
   * instead of checking every td element as originally.
   */
  function setCellHeights(original, copy) {
    var tr = original.find('tr'),
        tr_copy = copy.find('tr');
        
    var heights = [];
    
    tr.each(function (index) {
      heights[index] = this.offsetHeight;
    });
    
    tr_copy.each(function (index) {
      this.style.height = heights[index] + 'px';
    });
    
  }

});
