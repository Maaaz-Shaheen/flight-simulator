/*
The function map_point takes a range from P to Q and a point on that range X. It then takes in a new
range from A to B and returns the new mapping of X under that given range.
*/

function map_point(P, Q, A, B, X)
{
    //Checking if x-extent is greater or the y-extent
    if (Math.abs(P[0] - Q[0]) > Math.abs(P[1] - Q[1]))
    {
        alpha = (X[0] - Q[0])/(P[0] - Q[0]);
    }
    else
    {
        alpha = (X[1] - Q[1])/(P[1] - Q[1]);
    }

    //The mix function returns the new value of X under the range from A to B
    new_X = mix(A, B, alpha);

    return new_X;           
}



// Also perspective projection but with the parameters left, right, bottom, top, near, far

function frustum(left, right, bottom, top, near, far) {

    if (left == right) { throw "frustum(): left and right are equal";}
   
    if (bottom == top) { throw "frustum(): bottom and top are equal";}
   
    if (near == far) { throw "frustum(): near and far are equal";}
   
    let w = right - left;
   
    let h = top - bottom;
   
    let d = far - near;
   
    let result = mat4();
   
    result[0][0] = 2.0 * near / w;
   
    result[1][1] = 2.0 * near / h;
   
    result[2][2] = -(far + near) / d;
   
    result[0][2] = (right + left) / w;
   
    result[1][2] = (top + bottom) / h;
   
    result[2][3] = -2 * far * near / d;
   
    result[3][2] = -1;
   
    result[3][3] = 0.0;
   
    return result;
   
   }


   function inverseTranspose(m, flag)
   {
       var a = mat4();
       a = inverse(transpose(m));
       if(flag != true) return a;
       else {
       var b = mat3();
       for(var i=0;i<3;i++) for(var j=0; j<3; j++) b[i][j] = a[i][j];
       return b;
       }
   
   }