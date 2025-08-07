
<script>
  (function() {
    let input = "";
    window.addEventListener("keydown", function(e) {
      input += e.key;
      if (input.includes("777")) {
        window.location.href = "/secret/surprise.html";
      }
      if (input.length > 10) input = input.slice(-10); // keep last 10 keys
    });
  })();
</script>
