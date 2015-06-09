(function() {
  'use strict';

  $(document).foundation();

  var $filterForm = $('.form-filter');
  var $startDate = $('.field-start-date');
  var $endDate = $('.field-end-date');

  var today = moment().format('YYYY-MM-DD');

  $('.btn-all-orders').on('click', function() {

    $startDate.val('1970-01-01');
    $endDate.val(today);
    
    $filterForm.submit();

  });

  $('.btn-this-month').on('click', function() {

    $startDate.val( moment().startOf('month').format('YYYY-MM-DD') );
    $endDate.val(today);
    
    $filterForm.submit();

  });

  $('.btn-last-month').on('click', function() {

    $startDate.val( moment().subtract(1, 'months').startOf('month').format('YYYY-MM-DD') );
    $endDate.val( moment().subtract(1,'months').endOf('month').format('YYYY-MM-DD') );
    
    $filterForm.submit();

  });
  
  var $modalOrderDetails = $('.js-modal-order-details');
  var $modalOrderDetailsContent = $('.js-modal-content', $modalOrderDetails);

  var showOrderDetails = function() {
    
    var orderId = $(this).attr('data-id');
    
    var xhr = new XMLHttpRequest();
    
    xhr.open('GET', '/api/v1/order/' + orderId);
    xhr.responseType = 'json';
    
    $modalOrderDetailsContent[0].innerHTML = '';
    
    xhr.onload = function() {
      
      var html = '';
      
      // beautify the json object
      var node = JsonHuman.format(xhr.response);
      
      $modalOrderDetailsContent[0].appendChild(node);
      
    };
    
    xhr.send();
    
    $modalOrderDetails.foundation('reveal', 'open');
    
  };
  
  $('.js-btn-order-details').on('click', showOrderDetails);

}());
