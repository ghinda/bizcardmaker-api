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
