# gravity2

A simple gravitational many-body simulation, using symplectic (leapfrog and Yoshida) integrators,
with parallel computation via JavaScript Web Workers, and html canvas display that allows rotating.

There are 4800 point masses by default, and **all** pairwise interactions are taken into account — there is no mean field approximation.
To get some (eventual) speedup, particles that venture too far from the center (of mass) are removed from the system.

One crucial ingredient that speeds up the computation is the use of SharedArrayBuffer on which the workers operate.
This requires a proper setup of Cross-Origin-Embedder-Policy ("require-corp") and "Cross-Origin-Opener-Policy ("same-origin") headers on the server,
so to keep things simple the project is not deployed here.

You can check it out on my homepage [https://monodromy.group/gravity2/](https://monodromy.group/gravity2/) instead.

As the computation runs in the browser, its speed will vary,
so I have also collected the frames into a smooth animation, which you can enjoy on YouTube:

[![a cloud of gravitating mass particles](https://img.youtube.com/vi/FRE_YpVXwIE/0.jpg)](https://www.youtube.com/watch?v=FRE_YpVXwIE)
